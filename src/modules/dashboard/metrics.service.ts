/**
 * Dashboard Metric service — CRUD for the normalized metric values rendered into a report's fixed
 * layout. Owns: parent-report existence, FY/reporting-period/dataset reference + activation
 * validation, the "exactly one of value/value_text" rule on partial edits, the unique
 * (report, metric_key, FY, reporting-period) constraint (→ 409), audit logging, and public-cache
 * invalidation. Aggregation is FIXED (no custom engine/formula): metrics are stored values only.
 */
import type { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError } from '@/shared/errors';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { dashboardRepository, type MetricRow, type DashboardRefs } from './dashboard.repository';
import { toMetricDto, type MetricDto } from './dashboard.dto';
import { DASHBOARD_METRIC_ENTITY, type MetricFilters, type MetricOrderingField } from './dashboard.types';
import type { MetricCreateInput, MetricUpdateInput } from './dashboard.validators';
import { invalidateDashboardCache, requireUser } from './dashboard.shared';

const DUPLICATE =
  'A metric with this metric key already exists for the selected financial year and reporting period.';

function loaded(row: MetricRow | null): MetricRow {
  if (!row) throw new NotFoundError('Dashboard metric not found.');
  return row;
}

async function assertReportExists(reportId: string): Promise<void> {
  if (!(await dashboardRepository.findReportById(reportId))) {
    throw new NotFoundError('Dashboard report not found.');
  }
}

async function assertReferencesValid(refs: DashboardRefs): Promise<void> {
  const errors = await dashboardRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

/** Map a Prisma P2002 unique violation on the metric key to the project's 409. */
function asUniqueConflict(err: unknown): ConflictError | null {
  if (typeof err !== 'object' || err === null) return null;
  if ((err as { code?: string }).code !== 'P2002') return null;
  return new ConflictError(DUPLICATE);
}

export async function create(reportId: string, input: MetricCreateInput, ctx: AuditContext): Promise<MetricDto> {
  const userId = requireUser(ctx);
  await assertReportExists(reportId);
  await assertReferencesValid({
    financialYearId: input.financial_year_id ?? null,
    reportingPeriodId: input.reporting_period_id ?? null,
    datasetId: input.dataset_id ?? null,
    datasetReportId: reportId,
  });

  const fyId = input.financial_year_id ?? null;
  const rpId = input.reporting_period_id ?? null;
  if (await dashboardRepository.findMetricByUniqueKey(reportId, input.metric_key, fyId, rpId)) {
    throw new ConflictError(DUPLICATE);
  }

  let created: MetricRow;
  try {
    created = await dashboardRepository.createMetric({
      reportId,
      metricKey: input.metric_key,
      labelEn: input.label_en,
      labelHi: input.label_hi ?? null,
      value: input.value ?? null,
      valueText: input.value_text ?? null,
      unit: input.unit ?? null,
      financialYearId: fyId,
      reportingPeriodId: rpId,
      source: input.source ?? 'manual',
      datasetId: input.dataset_id ?? null,
      displayOrder: input.display_order ?? 0,
      createdById: userId,
      updatedById: userId,
    });
  } catch (err) {
    throw asUniqueConflict(err) ?? err;
  }

  await auditService.create(ctx, DASHBOARD_METRIC_ENTITY, created.id, {
    report_id: reportId,
    metric_key: created.metricKey,
  });
  await invalidateDashboardCache();
  return toMetricDto(created);
}

export async function update(
  reportId: string,
  id: string,
  input: MetricUpdateInput,
  ctx: AuditContext,
): Promise<MetricDto> {
  const userId = requireUser(ctx);
  await assertReportExists(reportId);
  const existing = loaded(await dashboardRepository.findMetricById(id));
  if (existing.reportId !== reportId) throw new NotFoundError('Dashboard metric not found.');

  // Re-validate only the references this PATCH actually touches.
  const refs: DashboardRefs = { datasetReportId: reportId };
  if (input.financial_year_id !== undefined) refs.financialYearId = input.financial_year_id;
  if (input.reporting_period_id !== undefined) refs.reportingPeriodId = input.reporting_period_id;
  if (input.dataset_id !== undefined) refs.datasetId = input.dataset_id;
  if (refs.financialYearId || refs.reportingPeriodId || refs.datasetId) await assertReferencesValid(refs);

  // Exactly-one-of-value against the EFFECTIVE (post-PATCH) state, so a one-field edit cannot leave
  // a metric with both or neither figure.
  if (input.value !== undefined || input.value_text !== undefined) {
    const effValue = input.value !== undefined ? input.value : existing.value;
    const effText = input.value_text !== undefined ? input.value_text : existing.valueText;
    const hasValue = effValue !== null && effValue !== undefined;
    const hasText = effText !== null && effText !== undefined;
    if (hasValue === hasText) {
      throw new ValidationError({ value: ['Provide exactly one of value or value_text.'] });
    }
  }

  // Duplicate prevention against the EFFECTIVE key, excluding this record.
  const keyTouched =
    input.metric_key !== undefined ||
    input.financial_year_id !== undefined ||
    input.reporting_period_id !== undefined;
  if (keyTouched) {
    const effKey = input.metric_key ?? existing.metricKey;
    const effFy = input.financial_year_id !== undefined ? input.financial_year_id : existing.financialYearId;
    const effRp =
      input.reporting_period_id !== undefined ? input.reporting_period_id : existing.reportingPeriodId;
    const dup = await dashboardRepository.findMetricByUniqueKey(reportId, effKey, effFy ?? null, effRp ?? null);
    if (dup && dup.id !== id) throw new ConflictError(DUPLICATE);
  }

  const data: Prisma.DashboardMetricUncheckedUpdateInput = { updatedById: userId };
  if (input.metric_key !== undefined) data.metricKey = input.metric_key;
  if (input.label_en !== undefined) data.labelEn = input.label_en;
  if (input.label_hi !== undefined) data.labelHi = input.label_hi;
  if (input.value !== undefined) data.value = input.value;
  if (input.value_text !== undefined) data.valueText = input.value_text;
  if (input.unit !== undefined) data.unit = input.unit;
  if (input.financial_year_id !== undefined) data.financialYearId = input.financial_year_id;
  if (input.reporting_period_id !== undefined) data.reportingPeriodId = input.reporting_period_id;
  if (input.source !== undefined) data.source = input.source;
  if (input.dataset_id !== undefined) data.datasetId = input.dataset_id;
  if (input.display_order !== undefined) data.displayOrder = input.display_order;

  let updated: MetricRow;
  try {
    updated = await dashboardRepository.updateMetric(id, data);
  } catch (err) {
    throw asUniqueConflict(err) ?? err;
  }

  await auditService.update(ctx, DASHBOARD_METRIC_ENTITY, id, undefined, { report_id: reportId });
  await invalidateDashboardCache();
  return toMetricDto(updated);
}

export async function remove(reportId: string, id: string, ctx: AuditContext): Promise<void> {
  await assertReportExists(reportId);
  const existing = loaded(await dashboardRepository.findMetricById(id));
  if (existing.reportId !== reportId) throw new NotFoundError('Dashboard metric not found.');
  await dashboardRepository.deleteMetric(id);
  await auditService.delete(ctx, DASHBOARD_METRIC_ENTITY, id, {
    report_id: reportId,
    metric_key: existing.metricKey,
  });
  await invalidateDashboardCache();
}

export interface MetricListResult {
  items: MetricDto[];
  total: number;
}

export async function list(
  reportId: string,
  filters: MetricFilters,
  ordering: { field: MetricOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<MetricListResult> {
  await assertReportExists(reportId);
  const { rows, total } = await dashboardRepository.listMetricsByReport(reportId, filters, skip, take, ordering);
  return { items: rows.map(toMetricDto), total };
}

export const metricService = { create, update, remove, list };
