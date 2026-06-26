/**
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
  row_count: number;
  financial_year: FinancialYearRef | null;
  reporting_period: ReportingPeriodRef | null;
  source_file: { id: string; url: string; file_name: string; mime_type: string } | null;
  processed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

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
}
