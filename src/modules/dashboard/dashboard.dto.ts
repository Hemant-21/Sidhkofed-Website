/**
 * Dashboard DTOs + mappers (API spec §5/§6 + §1.4 reference shapes).
 *
 * Admin shapes expose the full management view (provenance, dataset linkage, authorship, staging
 * status). PUBLIC shapes expose only the fixed report + resolved metrics and NEVER reveal internal
 * datasets, import metadata (`raw_rows`, `source_file_asset`), administrative authorship, or internal
 * IDs not intended for public use (API spec §1.3 / requirements §13 "Public Dashboard API").
 */
import type { ReportRow, MetricRow, DatasetRow } from './dashboard.repository';

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
/** Decimal column → JS number (safe for the dashboard's bounded magnitudes), or null. */
const num = (d: { toString(): string } | null): number | null => (d === null ? null : Number(d.toString()));

// ── Compact references ──────────────────────────────────────────────────────────
export interface FinancialYearRef {
  id: string;
  label: string;
}
function financialYearRef(fy: { id: string; label: string } | null): FinancialYearRef | null {
  return fy ? { id: fy.id, label: fy.label } : null;
}

export interface ReportingPeriodRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
function reportingPeriodRef(
  rp: { id: string; slug: string; nameEn: string; nameHi: string | null } | null,
): ReportingPeriodRef | null {
  return rp ? { id: rp.id, slug: rp.slug, name_en: rp.nameEn, name_hi: rp.nameHi } : null;
}

// ── Report: admin summary (list) ────────────────────────────────────────────────
export interface ReportSummaryDto {
  id: string;
  report_key: string;
  title_en: string;
  title_hi: string | null;
  publication_state: string;
  public_visibility: boolean;
  show_on_homepage: boolean;
  highlight_type: string | null;
  display_order: number | null;
  is_active: boolean;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toReportSummaryDto(r: ReportRow): ReportSummaryDto {
  return {
    id: r.id,
    report_key: r.reportKey,
    title_en: r.titleEn,
    title_hi: r.titleHi,
    publication_state: r.publicationState,
    public_visibility: r.publicVisibility,
    show_on_homepage: r.showOnHomepage,
    highlight_type: r.highlightType,
    display_order: r.displayOrder,
    is_active: r.isActive,
    published_at: iso(r.publishedAt),
    archived_at: iso(r.archivedAt),
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

// ── Report: admin detail (single) ───────────────────────────────────────────────
export interface ReportDetailDto extends ReportSummaryDto {
  description_en: string | null;
  description_hi: string | null;
  layout_config: unknown;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export function toReportDetailDto(r: ReportRow): ReportDetailDto {
  return {
    ...toReportSummaryDto(r),
    description_en: r.descriptionEn,
    description_hi: r.descriptionHi,
    layout_config: r.layoutConfig ?? null,
    publish_start_at: iso(r.publishStartAt),
    highlight_start_at: iso(r.highlightStartAt),
    highlight_end_at: iso(r.highlightEndAt),
    created_by: r.createdById,
    updated_by: r.updatedById,
  };
}

// ── Metric: admin DTO ────────────────────────────────────────────────────────────
export interface MetricDto {
  id: string;
  report_id: string;
  metric_key: string;
  label_en: string;
  label_hi: string | null;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  financial_year: FinancialYearRef | null;
  reporting_period: ReportingPeriodRef | null;
  source: string;
  dataset_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function toMetricDto(m: MetricRow): MetricDto {
  return {
    id: m.id,
    report_id: m.reportId,
    metric_key: m.metricKey,
    label_en: m.labelEn,
    label_hi: m.labelHi,
    value: num(m.value),
    value_text: m.valueText,
    unit: m.unit,
    financial_year: financialYearRef(m.financialYear),
    reporting_period: reportingPeriodRef(m.reportingPeriod),
    source: m.source,
    dataset_id: m.datasetId,
    display_order: m.displayOrder,
    created_at: m.createdAt.toISOString(),
    updated_at: m.updatedAt.toISOString(),
  };
}

// ── Dataset: admin DTO ───────────────────────────────────────────────────────────
export interface DatasetDto {
  id: string;
  report_id: string;
  source: string;
  status: string;
  row_count: number;
  financial_year: FinancialYearRef | null;
  reporting_period: ReportingPeriodRef | null;
  source_file: { id: string; url: string; file_name: string; mime_type: string } | null;
  processed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function toDatasetDto(d: DatasetRow): DatasetDto {
  return {
    id: d.id,
    report_id: d.reportId,
    source: d.source,
    status: d.status,
    row_count: d.rowCount,
    financial_year: financialYearRef(d.financialYear),
    reporting_period: reportingPeriodRef(d.reportingPeriod),
    source_file: d.sourceFileAsset
      ? {
          id: d.sourceFileAsset.id,
          url: d.sourceFileAsset.url,
          file_name: d.sourceFileAsset.fileName,
          mime_type: d.sourceFileAsset.mimeType,
        }
      : null,
    processed_at: iso(d.processedAt),
    created_by: d.createdById,
    created_at: d.createdAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  };
}

// ── Public metric (safe subset — no provenance/dataset/authorship) ──────────────
export interface PublicMetricDto {
  metric_key: string;
  label_en: string;
  label_hi: string | null;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  financial_year: FinancialYearRef | null;
  reporting_period: ReportingPeriodRef | null;
}

export function toPublicMetricDto(m: MetricRow): PublicMetricDto {
  return {
    metric_key: m.metricKey,
    label_en: m.labelEn,
    label_hi: m.labelHi,
    value: num(m.value),
    value_text: m.valueText,
    unit: m.unit,
    financial_year: financialYearRef(m.financialYear),
    reporting_period: reportingPeriodRef(m.reportingPeriod),
  };
}

// ── Public report summary (list — no metrics) ───────────────────────────────────
export interface PublicReportSummaryDto {
  report_key: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  display_order: number | null;
  highlight_type: string | null;
  public_url: string;
}

export function toPublicReportSummaryDto(r: ReportRow): PublicReportSummaryDto {
  return {
    report_key: r.reportKey,
    title_en: r.titleEn,
    title_hi: r.titleHi,
    description_en: r.descriptionEn,
    description_hi: r.descriptionHi,
    display_order: r.displayOrder,
    highlight_type: r.highlightType,
    public_url: `/dashboard/${r.reportKey}`,
  };
}

// ── Public report detail (report + resolved metrics + fixed layout) ─────────────
export interface PublicReportDetailDto extends PublicReportSummaryDto {
  layout_config: unknown;
  metrics: PublicMetricDto[];
}

export function toPublicReportDetailDto(r: ReportRow, metrics: MetricRow[]): PublicReportDetailDto {
  return {
    ...toPublicReportSummaryDto(r),
    layout_config: r.layoutConfig ?? null,
    metrics: metrics.map(toPublicMetricDto),
  };
}
