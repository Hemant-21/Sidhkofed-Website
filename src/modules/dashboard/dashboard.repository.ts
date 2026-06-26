/**
 * Dashboard repository — the ONLY Prisma caller for the dashboard module (coding-standards §6).
 * Covers all three entities (reports, metrics, datasets) because they form one aggregate managed
 * together. Encapsulates the public-visibility predicate so public vs admin report reads differ only
 * by it, applies the ordering allow-lists, and validates FY/reporting-period/report/dataset
 * references with read-only lookups (never another module's repository surface). Returns entities,
 * never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type {
  ReportFilters,
  ReportOrderingField,
  MetricFilters,
  MetricOrderingField,
  DatasetFilters,
  DatasetOrderingField,
} from './dashboard.types';

type Db = PrismaClient | Prisma.TransactionClient;

// ── Include shapes ──────────────────────────────────────────────────────────────
const metricInclude = {
  financialYear: { select: { id: true, label: true } },
  reportingPeriod: { select: { id: true, slug: true, nameEn: true, nameHi: true } },
} satisfies Prisma.DashboardMetricInclude;

const datasetInclude = {
  financialYear: { select: { id: true, label: true } },
  reportingPeriod: { select: { id: true, slug: true, nameEn: true, nameHi: true } },
  sourceFileAsset: { select: { id: true, url: true, fileName: true, mimeType: true } },
} satisfies Prisma.DashboardDatasetInclude;

export type ReportRow = Prisma.DashboardReportGetPayload<Record<string, never>>;
export type MetricRow = Prisma.DashboardMetricGetPayload<{ include: typeof metricInclude }>;
export type DatasetRow = Prisma.DashboardDatasetGetPayload<{ include: typeof datasetInclude }>;

// ── Reports ──────────────────────────────────────────────────────────────────────
const REPORT_ORDER_COLUMN: Record<
  ReportOrderingField,
  keyof Prisma.DashboardReportOrderByWithRelationInput
> = {
  display_order: 'displayOrder',
  published_at: 'publishedAt',
  created_at: 'createdAt',
};

/** Build the report `where` from validated filters. Exported for unit testing (pure, DB-free). */
export function buildReportWhere(
  f: ReportFilters,
  opts: { public?: boolean },
): Prisma.DashboardReportWhereInput {
  const where: Prisma.DashboardReportWhereInput = {};
  const and: Prisma.DashboardReportWhereInput[] = [];
  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.DashboardReportWhereInput);
    where.isActive = true;
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }
  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.isActive !== undefined && !opts.public) where.isActive = f.isActive;
  if (and.length > 0) where.AND = and;
  return where;
}

export async function reportKeyExists(reportKey: string, excludeId?: string, db: Db = prisma): Promise<boolean> {
  const where: Prisma.DashboardReportWhereInput = { reportKey };
  if (excludeId) where.id = { not: excludeId };
  return (await db.dashboardReport.count({ where })) > 0;
}

export async function createReport(
  data: Prisma.DashboardReportUncheckedCreateInput,
  db: Db = prisma,
): Promise<ReportRow> {
  return db.dashboardReport.create({ data });
}

export async function findReportById(id: string, db: Db = prisma): Promise<ReportRow | null> {
  return db.dashboardReport.findUnique({ where: { id } });
}

export async function findReportByKey(
  reportKey: string,
  opts: { public?: boolean } = {},
): Promise<ReportRow | null> {
  if (!opts.public) return prisma.dashboardReport.findUnique({ where: { reportKey } });
  return prisma.dashboardReport.findFirst({
    where: { ...buildReportWhere({}, { public: true }), reportKey },
  });
}

export async function updateReport(
  id: string,
  data: Prisma.DashboardReportUncheckedUpdateInput,
  db: Db = prisma,
): Promise<ReportRow> {
  return db.dashboardReport.update({ where: { id }, data });
}

export async function listReports(
  f: ReportFilters,
  skip: number,
  take: number,
  opts: { public?: boolean; ordering: { field: ReportOrderingField; direction: 'asc' | 'desc' } },
): Promise<{ rows: ReportRow[]; total: number }> {
  const where = buildReportWhere(f, { public: opts.public });
  const orderBy: Prisma.DashboardReportOrderByWithRelationInput[] = [
    { [REPORT_ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction },
  ];
  const [rows, total] = await Promise.all([
    prisma.dashboardReport.findMany({ where, orderBy, skip, take }),
    prisma.dashboardReport.count({ where }),
  ]);
  return { rows, total };
}

/** Reports flagged for the homepage KPI subset (published + visible). Ordered for display. */
export async function listHomepageReports(): Promise<ReportRow[]> {
  return prisma.dashboardReport.findMany({
    where: { ...buildReportWhere({}, { public: true }), showOnHomepage: true },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

// ── Metrics ────────────────────────────────────────────────────────────────────
const METRIC_ORDER_COLUMN: Record<
  MetricOrderingField,
  keyof Prisma.DashboardMetricOrderByWithRelationInput
> = {
  display_order: 'displayOrder',
  created_at: 'createdAt',
};

function buildMetricWhere(reportId: string, f: MetricFilters): Prisma.DashboardMetricWhereInput {
  const where: Prisma.DashboardMetricWhereInput = { reportId };
  if (f.financialYear) where.financialYearId = f.financialYear;
  if (f.reportingPeriod) where.reportingPeriodId = f.reportingPeriod;
  if (f.source) where.source = f.source;
  return where;
}

export async function createMetric(
  data: Prisma.DashboardMetricUncheckedCreateInput,
  db: Db = prisma,
): Promise<MetricRow> {
  return db.dashboardMetric.create({ data, include: metricInclude });
}

export async function findMetricById(id: string, db: Db = prisma): Promise<MetricRow | null> {
  return db.dashboardMetric.findUnique({ where: { id }, include: metricInclude });
}

export async function updateMetric(
  id: string,
  data: Prisma.DashboardMetricUncheckedUpdateInput,
  db: Db = prisma,
): Promise<MetricRow> {
  return db.dashboardMetric.update({ where: { id }, data, include: metricInclude });
}

export async function deleteMetric(id: string, db: Db = prisma): Promise<void> {
  await db.dashboardMetric.delete({ where: { id } });
}

export async function listMetricsByReport(
  reportId: string,
  f: MetricFilters,
  skip: number,
  take: number,
  ordering: { field: MetricOrderingField; direction: 'asc' | 'desc' },
): Promise<{ rows: MetricRow[]; total: number }> {
  const where = buildMetricWhere(reportId, f);
  const orderBy: Prisma.DashboardMetricOrderByWithRelationInput[] = [
    { [METRIC_ORDER_COLUMN[ordering.field]]: ordering.direction },
  ];
  const [rows, total] = await Promise.all([
    prisma.dashboardMetric.findMany({ where, include: metricInclude, orderBy, skip, take }),
    prisma.dashboardMetric.count({ where }),
  ]);
  return { rows, total };
}

/**
 * Find the metric occupying a (report, metric_key, FY, reporting-period) slot — the model's unique
 * constraint. Used by create (pre-check 409) and by import (decide insert vs refresh). Nullable FY/
 * reporting-period compare as `IS NULL`, matching the unique index semantics.
 */
export async function findMetricByUniqueKey(
  reportId: string,
  metricKey: string,
  financialYearId: string | null,
  reportingPeriodId: string | null,
  db: Db = prisma,
): Promise<{ id: string } | null> {
  return db.dashboardMetric.findFirst({
    where: { reportId, metricKey, financialYearId, reportingPeriodId },
    select: { id: true },
  });
}

/** Public metrics for a report, optionally narrowed to a FY / reporting period. Ordered for display. */
export async function listPublicMetrics(
  reportId: string,
  fyId: string | null,
  rpId: string | null,
): Promise<MetricRow[]> {
  const where: Prisma.DashboardMetricWhereInput = { reportId };
  if (fyId) where.financialYearId = fyId;
  if (rpId) where.reportingPeriodId = rpId;
  return prisma.dashboardMetric.findMany({
    where,
    include: metricInclude,
    orderBy: [{ displayOrder: 'asc' }, { metricKey: 'asc' }],
  });
}

// ── Datasets ─────────────────────────────────────────────────────────────────────
const DATASET_ORDER_COLUMN: Record<
  DatasetOrderingField,
  keyof Prisma.DashboardDatasetOrderByWithRelationInput
> = {
  created_at: 'createdAt',
  processed_at: 'processedAt',
};

function buildDatasetWhere(reportId: string, f: DatasetFilters): Prisma.DashboardDatasetWhereInput {
  const where: Prisma.DashboardDatasetWhereInput = { reportId };
  if (f.source) where.source = f.source;
  if (f.status) where.status = f.status;
  if (f.financialYear) where.financialYearId = f.financialYear;
  if (f.reportingPeriod) where.reportingPeriodId = f.reportingPeriod;
  return where;
}

export async function createDataset(
  data: Prisma.DashboardDatasetUncheckedCreateInput,
  db: Db = prisma,
): Promise<DatasetRow> {
  return db.dashboardDataset.create({ data, include: datasetInclude });
}

export async function findDatasetById(id: string, db: Db = prisma): Promise<DatasetRow | null> {
  return db.dashboardDataset.findUnique({ where: { id }, include: datasetInclude });
}

export async function listDatasetsByReport(
  reportId: string,
  f: DatasetFilters,
  skip: number,
  take: number,
  ordering: { field: DatasetOrderingField; direction: 'asc' | 'desc' },
): Promise<{ rows: DatasetRow[]; total: number }> {
  const where = buildDatasetWhere(reportId, f);
  const orderBy: Prisma.DashboardDatasetOrderByWithRelationInput[] = [
    { [DATASET_ORDER_COLUMN[ordering.field]]: ordering.direction },
  ];
  const [rows, total] = await Promise.all([
    prisma.dashboardDataset.findMany({ where, include: datasetInclude, orderBy, skip, take }),
    prisma.dashboardDataset.count({ where }),
  ]);
  return { rows, total };
}

/** Run a callback inside a transaction (dataset import creates dataset + metrics atomically). */
export async function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

// ── Reference / activation validation ──────────────────────────────────────────
export interface DashboardRefs {
  financialYearId?: string | null;
  reportingPeriodId?: string | null;
  datasetId?: string | null;
  /** When set, validate the dataset belongs to this report. */
  datasetReportId?: string;
  sourceFileAssetId?: string | null;
}

/**
 * Validate every supplied reference, returning field-keyed errors ({} when all valid). Financial
 * Year and Reporting Period are masters: they must exist AND be active (deactivated masters cannot
 * back new data). A dataset reference must exist and (when `datasetReportId` is given) belong to the
 * same report. A source file asset must exist and not be archived.
 */
export async function validateReferences(
  refs: DashboardRefs,
  db: Db = prisma,
): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};

  if (refs.financialYearId) {
    const row = await db.financialYear.findUnique({
      where: { id: refs.financialYearId },
      select: { isActive: true },
    });
    if (!row) errors.financial_year_id = ['Financial year not found.'];
    else if (!row.isActive) errors.financial_year_id = ['Financial year is inactive.'];
  }
  if (refs.reportingPeriodId) {
    const row = await db.reportingPeriod.findUnique({
      where: { id: refs.reportingPeriodId },
      select: { isActive: true },
    });
    if (!row) errors.reporting_period_id = ['Reporting period not found.'];
    else if (!row.isActive) errors.reporting_period_id = ['Reporting period is inactive.'];
  }
  if (refs.datasetId) {
    const row = await db.dashboardDataset.findUnique({
      where: { id: refs.datasetId },
      select: { reportId: true },
    });
    if (!row) errors.dataset_id = ['Dataset not found.'];
    else if (refs.datasetReportId && row.reportId !== refs.datasetReportId) {
      errors.dataset_id = ['Dataset does not belong to this report.'];
    }
  }
  if (refs.sourceFileAssetId) {
    const row = await db.mediaAsset.findUnique({
      where: { id: refs.sourceFileAssetId },
      select: { archivedAt: true },
    });
    if (!row) errors.source_file_asset_id = ['Source file asset not found.'];
    else if (row.archivedAt) errors.source_file_asset_id = ['Source file asset is archived.'];
  }
  return errors;
}

export const dashboardRepository = {
  // reports
  reportKeyExists,
  createReport,
  findReportById,
  findReportByKey,
  updateReport,
  listReports,
  listHomepageReports,
  // metrics
  createMetric,
  findMetricById,
  updateMetric,
  deleteMetric,
  listMetricsByReport,
  findMetricByUniqueKey,
  listPublicMetrics,
  // datasets
  createDataset,
  findDatasetById,
  listDatasetsByReport,
  // shared
  transaction,
  validateReferences,
};
