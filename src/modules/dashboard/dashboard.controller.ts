/**
 * Dashboard admin controllers — `/api/v1/admin/dashboard/*` (API spec §6). HTTP-only: parse →
 * validate → call the service → return through the shared envelope. Covers report definitions,
 * metrics, and datasets (import). Permissions are enforced at the route layer.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { uploadConfig } from '@/config';
import { ValidationError, UnsupportedFileTypeError } from '@/shared/errors';
import { reportService } from './reports.service';
import { metricService } from './metrics.service';
import { datasetService } from './datasets.service';
import { parseDatasetFile } from './dataset-parser';
import {
  validateReportCreate,
  validateReportUpdate,
  validateMetricCreate,
  validateMetricUpdate,
  validateDatasetCreate,
  validateDatasetUploadFields,
} from './dashboard.validators';
import {
  parseReportFilters,
  parseReportOrdering,
  parseMetricFilters,
  parseMetricOrdering,
  parseDatasetFilters,
  parseDatasetOrdering,
} from './dashboard.query';

type MulterFile = { buffer: Buffer; originalname: string; mimetype: string };
const maxDatasetBytes = uploadConfig.maxDatasetMb * 1024 * 1024;

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

// ── Reports ──────────────────────────────────────────────────────────────────────
export const createReport = wrap(async (req) => {
  const input = validateReportCreate(req.body);
  const dto = await reportService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Dashboard report created.') };
});

export const listReports = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseReportFilters(req);
  const ordering = parseReportOrdering(req);
  const { items, total } = await reportService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const reportDetail = wrap(async (req) => {
  const dto = await reportService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patchReport = wrap(async (req) => {
  const input = validateReportUpdate(req.body);
  const dto = await reportService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Dashboard report updated.') };
});

const reportLifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await reportService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Dashboard report ${action}ed.`) };
  });

export const publishReport = reportLifecycle('publish');
export const unpublishReport = reportLifecycle('unpublish');
export const archiveReport = reportLifecycle('archive');
export const restoreReport = reportLifecycle('restore');

// ── Metrics ────────────────────────────────────────────────────────────────────
export const listMetrics = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseMetricFilters(req);
  const ordering = parseMetricOrdering(req);
  const { items, total } = await metricService.list(
    req.params.report_id as string,
    filters,
    ordering,
    page.skip,
    page.take,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const createMetric = wrap(async (req) => {
  const input = validateMetricCreate(req.body);
  const dto = await metricService.create(req.params.report_id as string, input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Dashboard metric created.') };
});

export const patchMetric = wrap(async (req) => {
  const input = validateMetricUpdate(req.body);
  const dto = await metricService.update(
    req.params.report_id as string,
    req.params.id as string,
    input,
    auditContext(req),
  );
  return { status: 200, body: success(dto, String(req.id), 'Dashboard metric updated.') };
});

export const removeMetric = wrap(async (req) => {
  await metricService.remove(
    req.params.report_id as string,
    req.params.id as string,
    auditContext(req),
  );
  return { status: 204, body: undefined };
});

// ── Datasets ─────────────────────────────────────────────────────────────────────
export const listDatasets = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseDatasetFilters(req);
  const ordering = parseDatasetOrdering(req);
  const { items, total } = await datasetService.list(
    req.params.report_id as string,
    filters,
    ordering,
    page.skip,
    page.take,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const datasetDetail = wrap(async (req) => {
  const dto = await datasetService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

/** Manual dataset create (`source` = manual | cms_derived). */
export const createDataset = wrap(async (req) => {
  const input = validateDatasetCreate(req.body);
  const result = await datasetService.importDataset(
    req.params.report_id as string,
    {
      source: input.source ?? 'manual',
      financialYearId: input.financial_year_id ?? null,
      reportingPeriodId: input.reporting_period_id ?? null,
      sourceFileAssetId: input.source_file_asset_id ?? null,
      preview: input.preview ?? false,
      rows: input.rows,
    },
    auditContext(req),
  );
  if ('preview' in result) {
    return { status: 200, body: success(result, String(req.id), 'Dataset import preview.') };
  }
  return { status: 201, body: success(result, String(req.id), 'Dataset processed.') };
});

/**
 * Excel/CSV upload import (multipart; API spec §6). `source` is fixed to `excel`. The uploaded file is
 * validated (presence, configured MIME allow-list, size, content family), parsed server-side into
 * rows, then handed to the SAME transactional import core as the manual route (no duplicated row
 * validation). Accompanying multipart text fields carry the financial year / reporting period and the
 * optional `preview` flag.
 */
export const uploadDataset = wrap(async (req) => {
  const file = (req as Request & { file?: MulterFile }).file;
  if (!file) throw new ValidationError({ file: ['A CSV or XLSX file is required.'] });
  if (!uploadConfig.allowedDatasetTypes.includes(file.mimetype)) {
    throw new UnsupportedFileTypeError(
      `Type "${file.mimetype}" is not a permitted dataset upload. Use CSV or XLSX.`,
    );
  }
  if (file.buffer.byteLength > maxDatasetBytes) {
    throw new ValidationError({
      file: [`File exceeds the ${uploadConfig.maxDatasetMb} MB dataset limit.`],
    });
  }

  const fields = validateDatasetUploadFields(req.body);
  const rows = parseDatasetFile(file.buffer, file.mimetype);

  const result = await datasetService.importDataset(
    req.params.report_id as string,
    {
      source: 'excel',
      financialYearId: fields.financial_year_id ?? null,
      reportingPeriodId: fields.reporting_period_id ?? null,
      sourceFileAssetId: null, // parsed in-memory; the sheet is not persisted as a media asset
      preview: fields.preview === 'true',
      rows,
    },
    auditContext(req),
  );
  if ('preview' in result) {
    return { status: 200, body: success(result, String(req.id), 'Dataset import preview.') };
  }
  return { status: 201, body: success(result, String(req.id), 'Dataset imported.') };
});

export const dashboardController = {
  createReport,
  listReports,
  reportDetail,
  patchReport,
  publishReport,
  unpublishReport,
  archiveReport,
  restoreReport,
  listMetrics,
  createMetric,
  patchMetric,
  removeMetric,
  listDatasets,
  datasetDetail,
  createDataset,
  uploadDataset,
};
