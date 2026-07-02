/**
 * Admin Dashboard DTOs (Phase 15.2). These mirror the backend dashboard + audit
 * contracts EXACTLY (src/modules/dashboard/dashboard.dto.ts, audit.dto.ts) so the
 * frontend never invents a shape. The dashboard is a FIXED set of reports/KPIs —
 * the UI reads backend-resolved values and never computes a KPI itself
 * (codex §13 / build-context §8.3).
 */

import type { HighlightType, PublicationState } from './common';

/** Compact financial-year reference (dashboard DTO). */
export interface FinancialYearRef {
  id: string;
  label: string;
}

/** Compact reporting-period reference (dashboard DTO). */
export interface ReportingPeriodRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}

/**
 * A resolved public metric — the homepage-safe subset (no provenance/authorship).
 * `value` (numeric) and `value_text` (string) are mutually exclusive per metric.
 */
export interface PublicMetric {
  metric_key: string;
  label_en: string;
  label_hi: string | null;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  financial_year: FinancialYearRef | null;
  reporting_period: ReportingPeriodRef | null;
}

/** A public fixed report + its resolved metrics + the fixed layout descriptor. */
export interface PublicReportDetail {
  report_key: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  display_order: number | null;
  highlight_type: HighlightType | null;
  public_url: string;
  layout_config: unknown;
  metrics: PublicMetric[];
}

/** `GET /public/dashboard/kpis` payload. */
export interface DashboardKpisResponse {
  kpis: PublicReportDetail[];
}

/** Period filters accepted by the public dashboard endpoints (API spec §5). */
export interface DashboardPeriodFilters {
  financial_year?: string;
  reporting_period?: string;
}

/** Admin report summary (`GET /admin/dashboard/reports` list item). */
export interface DashboardReportSummary {
  id: string;
  report_key: string;
  title_en: string;
  title_hi: string | null;
  publication_state: PublicationState;
  public_visibility: boolean;
  show_on_homepage: boolean;
  highlight_type: HighlightType | null;
  display_order: number | null;
  is_active: boolean;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** One audit-log entry (`GET /admin/audit-logs`). Drives Recent Activity. */
export interface AuditLogEntry {
  id: string;
  action: string;
  event: string | null;
  module: string;
  record_id: string | null;
  previous_state: string | null;
  new_state: string | null;
  change_summary: string | null;
  metadata: unknown;
  user: { id: string; email: string; full_name: string } | null;
  created_at: string;
}
