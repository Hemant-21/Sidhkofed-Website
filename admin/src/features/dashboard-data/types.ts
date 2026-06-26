/**
<<<<<<< HEAD
 * Dashboard Data module types — mirror of the backend dashboard DTOs (dashboard.dto.ts) for the
 * data-management surface: a report's datasets (imports) and resolved metrics. The report catalog
 * type is reused from `@/types/dashboard`.
 */

export interface FinancialYearRef {
  id: string;
  label: string;
}

export interface ReportingPeriodRef {
  id: string;
  label: string;
}

export interface Dataset {
  id: string;
  report_id: string;
  source: string;
  status: string;
=======
 * Dashboard Data module types — a faithful mirror of the backend dashboard DTOs (dashboard.dto.ts)
 * and request validators (dashboard.validators.ts). The frontend consumes these contracts exactly;
 * it never invents a shape, computes a metric, or aggregates client-side (codex §13 / build-context
 * §8.3). `snake_case` matches the API transport (API spec §0).
 *
 * The dashboard is a FIXED set of predefined reports — fixed keys, fixed layouts, fixed
 * aggregations. There is NO report builder, chart builder, or analytics engine. Administrators
 * manage report visibility + display order + reporting period + the metric/dataset DATA only.
 */

import type { HighlightType } from '@/types/common';
import type {
  DashboardReportSummary,
  FinancialYearRef,
  ReportingPeriodRef,
} from '@/types/dashboard';

export type {
  DashboardReportSummary,
  FinancialYearRef,
  ReportingPeriodRef,
  PublicReportDetail,
  PublicMetric,
} from '@/types/dashboard';

/** Dataset provenance + lifecycle (dashboard.types.ts). */
export const DATASET_SOURCES = ['cms_derived', 'manual', 'excel'] as const;
export const DATASET_STATUSES = ['pending', 'processed', 'failed'] as const;
export type DatasetSource = (typeof DATASET_SOURCES)[number];
export type DatasetStatus = (typeof DATASET_STATUSES)[number];

export const DATASET_SOURCE_LABEL: Record<DatasetSource, string> = {
  cms_derived: 'CMS-derived',
  manual: 'Manual',
  excel: 'Excel / CSV',
};
export const DATASET_STATUS_LABEL: Record<DatasetStatus, string> = {
  pending: 'Pending',
  processed: 'Processed',
  failed: 'Failed',
};

/**
 * The FIXED dashboard report catalog (FIXED_DASHBOARD_REPORTS in dashboard.types.ts). Report keys
 * are stable and code-referenced; a report definition may only use one of these keys.
 */
export const FIXED_REPORTS: ReadonlyArray<{ key: string; title: string }> = [
  { key: 'procurement_summary', title: 'Procurement Summary' },
  { key: 'training_summary', title: 'Training Summary' },
  { key: 'beneficiaries_reached', title: 'Beneficiaries Reached' },
  { key: 'activities_events_summary', title: 'Activities / Events Summary' },
  { key: 'district_geographical_coverage', title: 'District and Geographical Coverage' },
  { key: 'commodity_wise_activities', title: 'Commodity-wise Activities' },
  { key: 'commodity_wise_toolkit_distribution', title: 'Commodity-wise Toolkit Distribution' },
  { key: 'programme_scheme_coverage', title: 'Programme / Scheme Coverage' },
  { key: 'partnerships_mous', title: 'Partnerships and MoUs' },
  { key: 'sidhkofed_primary_membership', title: 'SIDHKOFED Primary Membership' },
  { key: 'sidhkofed_nominal_membership', title: 'SIDHKOFED Nominal Membership' },
  { key: 'du_primary_membership', title: 'DU Primary Membership' },
  { key: 'du_nominal_membership', title: 'DU Nominal Membership' },
] as const;

/** Admin report detail (ReportDetailDto) — adds layout/scheduling/authorship to the summary. */
export interface ReportDetail extends DashboardReportSummary {
  description_en: string | null;
  description_hi: string | null;
  layout_config: unknown;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Report create/update body — only the model-backed fields + allowed workflow fields the backend
 * validator accepts (dashboard.validators.ts, `.strict()`). `report_key` is set only on create and
 * must be one of the fixed keys; PATCH never changes it. `layout_config` is a bounded presentation
 * object, never a builder. Server-managed fields (slug, state, *_by, published_at) are never produced.
 */
export interface ReportWriteInput {
  report_key?: string;
  title_en?: string;
  title_hi?: string | null;
  description_en?: string | null;
  description_hi?: string | null;
  layout_config?: Record<string, unknown> | null;
  is_active?: boolean;
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
  show_on_homepage?: boolean;
}

/** Admin metric (MetricDto). */
export interface Metric {
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
  source: DatasetSource;
  dataset_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Metric create/update body (dashboard.validators.ts → metricBaseShape). Exactly one of
 * `value` / `value_text` carries the figure. The frontend NEVER computes a metric value — the
 * editor enters the backend-authored figure verbatim.
 */
export interface MetricWriteInput {
  metric_key?: string;
  label_en?: string;
  label_hi?: string | null;
  value?: number | null;
  value_text?: string | null;
  unit?: string | null;
  financial_year_id?: string | null;
  reporting_period_id?: string | null;
  source?: DatasetSource;
  dataset_id?: string | null;
  display_order?: number;
}

/** Admin dataset (DatasetDto). */
export interface Dataset {
  id: string;
  report_id: string;
  source: DatasetSource;
  status: DatasetStatus;
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
  row_count: number;
  financial_year: FinancialYearRef | null;
  reporting_period: ReportingPeriodRef | null;
  source_file: { id: string; url: string; file_name: string; mime_type: string } | null;
  processed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

<<<<<<< HEAD
export interface Metric {
  id: string;
  report_id: string;
  metric_key: string;
  label_en: string;
  label_hi: string | null;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  source: string;
  dataset_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
=======
/** One row of a dataset import (dashboard.validators.ts → datasetRowShape). */
export interface DatasetRowInput {
  metric_key: string;
  label_en: string;
  label_hi?: string | null;
  value?: number | null;
  value_text?: string | null;
  unit?: string | null;
  display_order?: number;
}

/** Manual dataset create body (`source` = cms_derived | manual). */
export interface DatasetCreateInput {
  source?: 'cms_derived' | 'manual';
  financial_year_id?: string | null;
  reporting_period_id?: string | null;
  source_file_asset_id?: string | null;
  preview?: boolean;
  rows: DatasetRowInput[];
}

/** Row-level error (datasets.service.ts → RowError). */
export interface DatasetRowError {
  row: number;
  fields: Record<string, string[]>;
}

/** Preview result — validation only, nothing persisted (datasets.service.ts → DatasetPreviewResult). */
export interface DatasetPreviewResult {
  preview: true;
  valid: boolean;
  row_count: number;
  errors: DatasetRowError[];
}

/** Import result — dataset persisted + metrics created/updated (DatasetImportResult). */
export interface DatasetImportResult {
  dataset: Dataset;
  metrics_created: number;
  metrics_updated: number;
}

export type DatasetResult = DatasetPreviewResult | DatasetImportResult;

/** Narrow a dataset result to the preview shape. */
export function isDatasetPreview(r: DatasetResult): r is DatasetPreviewResult {
  return 'preview' in r;
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
}
