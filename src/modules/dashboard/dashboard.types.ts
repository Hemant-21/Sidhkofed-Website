/**
 * Dashboard shared types — the framework-free contract used by the controllers, services, and
 * repository (mirrors memberships.types.ts). The dashboard is a FIXED set of predefined reports
 * (CMS requirements §13 / build-context §8.3): fixed keys, fixed layouts, fixed aggregations. There
 * is NO report builder, chart builder, or analytics engine. Administrators manage data + visibility
 * + display order + reporting period ONLY.
 */
import type { PublicationState } from '@/shared/publishing';

/** Audit module keys for the three dashboard entities. */
export const DASHBOARD_REPORT_ENTITY = 'dashboard_report';
export const DASHBOARD_METRIC_ENTITY = 'dashboard_metric';
export const DASHBOARD_DATASET_ENTITY = 'dashboard_dataset';

/** Dataset provenance (Part 8 enum). Only these three — never API or live-ERP sources. */
export const DATASET_SOURCES = ['cms_derived', 'manual', 'excel'] as const;
export type DatasetSourceValue = (typeof DATASET_SOURCES)[number];

/** Dataset processing lifecycle (schema Part 8). */
export const DATASET_STATUSES = ['pending', 'processed', 'failed'] as const;
export type DatasetStatus = (typeof DATASET_STATUSES)[number];

/**
 * The FIXED dashboard report catalog (CMS requirements §13). Report keys are stable and
 * code-referenced; the seeder upserts exactly these definitions and administrators may not create
 * arbitrary report types. `defaultSource` records whether the report is normally CMS-derived or fed
 * by manual/Excel summary data — purely informational for editors; it does not change behaviour.
 */
export interface FixedReportDefinition {
  reportKey: string;
  titleEn: string;
  displayOrder: number;
  defaultSource: DatasetSourceValue;
}

export const FIXED_DASHBOARD_REPORTS: readonly FixedReportDefinition[] = [
  { reportKey: 'procurement_summary', titleEn: 'Procurement Summary', displayOrder: 1, defaultSource: 'manual' },
  { reportKey: 'training_summary', titleEn: 'Training Summary', displayOrder: 2, defaultSource: 'cms_derived' },
  { reportKey: 'beneficiaries_reached', titleEn: 'Beneficiaries Reached', displayOrder: 3, defaultSource: 'manual' },
  { reportKey: 'activities_events_summary', titleEn: 'Activities / Events Summary', displayOrder: 4, defaultSource: 'cms_derived' },
  { reportKey: 'district_geographical_coverage', titleEn: 'District and Geographical Coverage', displayOrder: 5, defaultSource: 'cms_derived' },
  { reportKey: 'commodity_wise_activities', titleEn: 'Commodity-wise Activities', displayOrder: 6, defaultSource: 'cms_derived' },
  { reportKey: 'commodity_wise_toolkit_distribution', titleEn: 'Commodity-wise Toolkit Distribution', displayOrder: 7, defaultSource: 'cms_derived' },
  { reportKey: 'programme_scheme_coverage', titleEn: 'Programme / Scheme Coverage', displayOrder: 8, defaultSource: 'cms_derived' },
  { reportKey: 'partnerships_mous', titleEn: 'Partnerships and MoUs', displayOrder: 9, defaultSource: 'cms_derived' },
  { reportKey: 'sidhkofed_primary_membership', titleEn: 'SIDHKOFED Primary Membership', displayOrder: 10, defaultSource: 'cms_derived' },
  { reportKey: 'sidhkofed_nominal_membership', titleEn: 'SIDHKOFED Nominal Membership', displayOrder: 11, defaultSource: 'cms_derived' },
  { reportKey: 'du_primary_membership', titleEn: 'DU Primary Membership', displayOrder: 12, defaultSource: 'cms_derived' },
  { reportKey: 'du_nominal_membership', titleEn: 'DU Nominal Membership', displayOrder: 13, defaultSource: 'cms_derived' },
] as const;

/** Set of valid fixed report keys for fast membership checks (create/seed validation). */
export const FIXED_REPORT_KEYS = new Set<string>(FIXED_DASHBOARD_REPORTS.map((r) => r.reportKey));

// ── Reports: filters + ordering ─────────────────────────────────────────────────
export interface ReportFilters {
  publicationState?: PublicationState;
  showOnHomepage?: boolean;
  isActive?: boolean;
}

export const REPORT_ORDERING_FIELDS = ['display_order', 'published_at', 'created_at'] as const;
export type ReportOrderingField = (typeof REPORT_ORDERING_FIELDS)[number];

// ── Metrics: filters + ordering ─────────────────────────────────────────────────
export interface MetricFilters {
  financialYear?: string; // id or slug-less label match handled in repo (id only here)
  reportingPeriod?: string; // id
  source?: DatasetSourceValue;
}

export const METRIC_ORDERING_FIELDS = ['display_order', 'created_at'] as const;
export type MetricOrderingField = (typeof METRIC_ORDERING_FIELDS)[number];

// ── Datasets: filters + ordering ────────────────────────────────────────────────
export interface DatasetFilters {
  source?: DatasetSourceValue;
  status?: DatasetStatus;
  financialYear?: string; // id
  reportingPeriod?: string; // id
}

export const DATASET_ORDERING_FIELDS = ['created_at', 'processed_at'] as const;
export type DatasetOrderingField = (typeof DATASET_ORDERING_FIELDS)[number];

// ── Public dashboard filters (API spec §5) ──────────────────────────────────────
export interface PublicDashboardFilters {
  financialYear?: string; // id
  reportingPeriod?: string; // id
}
