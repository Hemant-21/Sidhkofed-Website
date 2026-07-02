/**
 * Dashboard Dataset service — manual entry + Excel/CSV import (API spec §6). The dataset is the
 * ingest unit; each validated row becomes (or refreshes) one durable `dashboard_metrics` row.
 *
 * Import safety (requirements §"Excel Import" / §"Import Safety"):
 *   - EVERY row is validated first (shape + exactly-one-of-value + within-batch duplicate metric_key
 *     detection + references). The whole batch is all-or-nothing: if ANY row is invalid the import is
 *     REJECTED with row-wise errors and NOTHING is persisted (no partial import).
 *   - A valid batch is applied inside ONE transaction (dataset row + every metric). Any failure rolls
 *     the entire transaction back — never a partially-imported dataset.
 *   - `preview=true` validates and returns the row-wise errors WITHOUT persisting (import preview).
 *
 * Duplicate detection: two rows sharing a metric_key inside one batch collide on the report/key/FY/
 * period uniqueness and are rejected; an existing metric for the same key+period is REFRESHED (an
 * idempotent re-upload of a period's figures), counted as updated.
 */
import type { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { dashboardRepository, type DatasetRow, type DashboardRefs } from './dashboard.repository';
import { toDatasetDto, type DatasetDto } from './dashboard.dto';
import {
  DASHBOARD_DATASET_ENTITY,
  type DatasetSourceValue,
  type DatasetFilters,
  type DatasetOrderingField,
} from './dashboard.types';
import { datasetRowSchema, type DatasetRowInput } from './dashboard.validators';
import { invalidateDashboardCache, requireUser } from './dashboard.shared';

export interface RowError {
  row: number;
  fields: Record<string, string[]>;
}

export interface DatasetImportParams {
  source: DatasetSourceValue;
  financialYearId: string | null;
  reportingPeriodId: string | null;
  sourceFileAssetId: string | null;
  preview: boolean;
  rows: unknown[];
}

export interface DatasetPreviewResult {
  preview: true;
  valid: boolean;
  row_count: number;
  errors: RowError[];
}

export interface DatasetImportResult {
  dataset: DatasetDto;
  metrics_created: number;
  metrics_updated: number;
}

export type DatasetResult = DatasetPreviewResult | DatasetImportResult;

async function assertReportExists(reportId: string): Promise<void> {
  if (!(await dashboardRepository.findReportById(reportId))) {
    throw new NotFoundError('Dashboard report not found.');
  }
}

/**
 * Map a Prisma P2002 unique violation (the `dashboard_metrics_unique` index, now NULLS NOT DISTINCT)
 * to the project's 409. Backstops the race where a concurrent import inserts the same metric key
 * between this import's find-check and its write; the whole transaction has already rolled back.
 */
function asUniqueConflict(err: unknown): ConflictError | null {
  if (typeof err !== 'object' || err === null) return null;
  if ((err as { code?: string }).code !== 'P2002') return null;
  return new ConflictError(
    'A metric for this report, key, financial year and reporting period was created concurrently.',
  );
}

async function assertReferencesValid(refs: DashboardRefs): Promise<void> {
  const errors = await dashboardRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

/** Validate every row (shape + within-batch duplicate metric_key). Returns parsed rows + row errors. */
function validateRows(rows: unknown[]): { valid: DatasetRowInput[]; errors: RowError[] } {
  const valid: DatasetRowInput[] = [];
  const errors: RowError[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < rows.length; i += 1) {
    const parsed = datasetRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      const fields: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.length ? issue.path.join('.') : '_';
        (fields[key] ??= []).push(issue.message);
      }
      errors.push({ row: i, fields });
      continue;
    }
    if (seenKeys.has(parsed.data.metric_key)) {
      errors.push({ row: i, fields: { metric_key: ['Duplicate metric_key within this import.'] } });
      continue;
    }
    seenKeys.add(parsed.data.metric_key);
    valid.push(parsed.data);
  }
  return { valid, errors };
}

/** Flatten row errors into the §1.4 field-error envelope (`rows.{i}.{field}`). */
function flattenRowErrors(errors: RowError[]): Record<string, string[]> {
  const flat: Record<string, string[]> = {};
  for (const e of errors) {
    for (const [field, messages] of Object.entries(e.fields)) {
      flat[`rows.${e.row}.${field}`] = messages;
    }
  }
  return flat;
}

/**
 * Manual create OR Excel/CSV import — one path, all-or-nothing. The caller fixes the `source`
 * (`manual`/`cms_derived` for the manual route; `excel` for the upload route).
 */
export async function importDataset(
  reportId: string,
  params: DatasetImportParams,
  ctx: AuditContext,
): Promise<DatasetResult> {
  const userId = requireUser(ctx);
  await assertReportExists(reportId);
  await assertReferencesValid({
    financialYearId: params.financialYearId,
    reportingPeriodId: params.reportingPeriodId,
    sourceFileAssetId: params.sourceFileAssetId,
  });

  const { valid, errors } = validateRows(params.rows);

  // Preview: report validation result, persist nothing.
  if (params.preview) {
    return { preview: true, valid: errors.length === 0, row_count: params.rows.length, errors };
  }
  // All-or-nothing: any invalid row rejects the whole import (no partial data).
  if (errors.length > 0) {
    throw new ValidationError(
      flattenRowErrors(errors),
      'Import rejected: one or more rows are invalid.',
    );
  }

  const fyId = params.financialYearId;
  const rpId = params.reportingPeriodId;
  let metricsCreated = 0;
  let metricsUpdated = 0;

  let dataset;
  try {
    dataset = await dashboardRepository.transaction(async (tx) => {
      const created = await dashboardRepository.createDataset(
        {
          reportId,
          source: params.source,
          financialYearId: fyId,
          reportingPeriodId: rpId,
          sourceFileAssetId: params.sourceFileAssetId,
          rawRows: valid as unknown as Prisma.InputJsonValue,
          rowCount: valid.length,
          status: 'processed',
          processedAt: new Date(),
          createdById: userId,
        },
        tx,
      );

      for (const row of valid) {
        const existing = await dashboardRepository.findMetricByUniqueKey(
          reportId,
          row.metric_key,
          fyId,
          rpId,
          tx,
        );
        const metricData = {
          labelEn: row.label_en,
          labelHi: row.label_hi ?? null,
          value: row.value ?? null,
          valueText: row.value_text ?? null,
          unit: row.unit ?? null,
          source: params.source,
          datasetId: created.id,
          displayOrder: row.display_order ?? 0,
          updatedById: userId,
        };
        if (existing) {
          await dashboardRepository.updateMetric(existing.id, metricData, tx);
          metricsUpdated += 1;
        } else {
          await dashboardRepository.createMetric(
            {
              reportId,
              metricKey: row.metric_key,
              financialYearId: fyId,
              reportingPeriodId: rpId,
              createdById: userId,
              ...metricData,
            },
            tx,
          );
          metricsCreated += 1;
        }
      }
      return created;
    });
  } catch (err) {
    // The whole transaction rolled back; surface a concurrent-insert race as 409, else re-throw.
    throw asUniqueConflict(err) ?? err;
  }

  await auditService.create(ctx, DASHBOARD_DATASET_ENTITY, dataset.id, {
    report_id: reportId,
    source: params.source,
    row_count: dataset.rowCount,
    metrics_created: metricsCreated,
    metrics_updated: metricsUpdated,
  });
  await invalidateDashboardCache();

  const persisted = await dashboardRepository.findDatasetById(dataset.id);
  return {
    dataset: toDatasetDto(persisted ?? dataset),
    metrics_created: metricsCreated,
    metrics_updated: metricsUpdated,
  };
}

function loaded(row: DatasetRow | null): DatasetRow {
  if (!row) throw new NotFoundError('Dashboard dataset not found.');
  return row;
}

export async function getById(id: string): Promise<DatasetDto> {
  return toDatasetDto(loaded(await dashboardRepository.findDatasetById(id)));
}

export interface DatasetListResult {
  items: DatasetDto[];
  total: number;
}

export async function list(
  reportId: string,
  filters: DatasetFilters,
  ordering: { field: DatasetOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<DatasetListResult> {
  await assertReportExists(reportId);
  const { rows, total } = await dashboardRepository.listDatasetsByReport(
    reportId,
    filters,
    skip,
    take,
    ordering,
  );
  return { items: rows.map(toDatasetDto), total };
}

export const datasetService = { importDataset, getById, list };
