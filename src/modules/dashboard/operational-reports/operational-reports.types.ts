/**
 * Shared TypeScript types for the Operational Reports module (Stage 1 of the Operational Reports /
 * Website Metrics plan). This module computes reports LIVE from operational records — no stored,
 * editable numbers. `operational-reports.registry.ts` is the single source of truth for which
 * reports/measures exist and their public eligibility; Stage 2 (Website Metrics) imports it to
 * validate that a metric configuration references a real, public-eligible report+measure, so keep
 * this file (and the registry) free of controller/Express/Prisma concerns.
 */

/** The fixed set of report keys. Adding a report is a code change, never data entry. */
export type ReportKey =
  | 'event_activity_outcomes'
  | 'training_attendance'
  | 'programme_activity_coverage'
  | 'district_activity_coverage'
  | 'toolkit_item_distribution'
  | 'procurement_register';

/**
 * `fixed_range`      — explicit ISO start/end dates, inclusive.
 * `financial_year`   — resolved from a named `FinancialYear` row.
 * `current_financial_year` — resolved from whichever `FinancialYear` row is unambiguously "current"
 *                            (isActive=true AND today, in Asia/Kolkata, falls within its range).
 *                            Throws a validation error if that is not unique.
 */
export type PeriodMode = 'fixed_range' | 'financial_year' | 'current_financial_year';

export interface PeriodInput {
  mode: PeriodMode;
  /** Required when mode = 'fixed_range'. Inclusive, `YYYY-MM-DD`. */
  startDate?: string;
  endDate?: string;
  /** Required when mode = 'financial_year'. */
  financialYearLabel?: string;
}

/** The period actually used to filter records, plus a human-readable basis description. */
export interface ResolvedPeriod {
  mode: PeriodMode;
  /** Inclusive UTC-midnight boundaries representing Asia/Kolkata calendar dates. */
  start: Date;
  /** Inclusive UTC-midnight boundary (end-of-day in Asia/Kolkata terms is folded into the date). */
  end: Date;
  basisDescription: string;
  financialYearLabel?: string;
}

export type CompletenessRequirement = 'none' | 'date_basis' | 'attendance' | 'quantity_and_unit';

export interface MeasureDefinition {
  key: string;
  calculationVersion: number;
  labelEn: string;
  labelHi?: string;
  unit: string | null;
  noteEn: string;
  noteHi?: string;
  supportedFilters: string[];
  supportedPeriodModes: PeriodMode[];
  /**
   * Whether this measure may ever be surfaced publicly via a Website Metric (Stage 2). Ambiguous,
   * mixed-unit, or internally-scoped-only measures MUST be false. `false` measures are never
   * imported into a public configuration by Stage 2's validators.
   */
  publicEligible: boolean;
  completenessRequirement: CompletenessRequirement;
}

export interface ReportDefinition {
  key: ReportKey;
  titleEn: string;
  titleHi?: string;
  /** Human description of which date field anchors period filtering for this report. */
  dateBasisField: string;
  supportedFilters: string[];
  measures: MeasureDefinition[];
}

/** Public (registry-only) view of a report definition — no repository/service internals. */
export type ReportCatalogueEntry = ReportDefinition;

export interface CompletenessInfo {
  /** Records that fall within the resolved period and have the relevant field populated. */
  known: number;
  /** Records that fall within the resolved period but are missing the relevant field. */
  missing: number;
  /** Records excluded from the period filter entirely because they have no date-basis value. */
  undated: number;
}

export interface MeasureResult {
  key: string;
  calculationVersion: number;
  labelEn: string;
  labelHi?: string;
  unit: string | null;
  /** Null is preserved (no eligible records) — never coalesced to 0. */
  value: number | null;
  completeness: CompletenessInfo | null;
  noteEn: string;
  noteHi?: string;
}

export interface PaginatedRows<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReportResult<Row = Record<string, unknown>> {
  reportKey: ReportKey;
  resolvedPeriod: ResolvedPeriod;
  filters: Record<string, string[]>;
  summary: MeasureResult[];
  rows: PaginatedRows<Row>;
  calculatedAt: Date;
}
