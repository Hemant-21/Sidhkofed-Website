/**
 * Shared contract for the three operational reports (Programme, District Activity Coverage,
 * Commodity-wise) that replace the six-report `operational-reports` catalogue in the CMS "Generate
 * Reports" screen. See workspace-root `*-trial.sql` files for the validated calculation approaches
 * this module implements (improved: standardized toolkit status, full filter support, FY-based
 * period resolution) — those files are prototypes, not production code copied verbatim.
 *
 * Internal IDs are kept on every row/drill-down/toolkit entry for stable keys and joins, but MUST
 * NEVER be rendered as a report column or Excel data column — only names/labels are displayed.
 */

export type ReportKey = 'programme_report' | 'district_activity_coverage' | 'commodity_report';

export type ReportScope = 'cms_operational' | 'public_preview' | 'public_published';

/** Standardized across all three reports and Excel — see workspace-root prompt's TOOLKIT INFORMATION rules. */
export type ToolkitItemStatus =
  | 'distributed'
  | 'partially_distributed'
  | 'not_distributed'
  | 'not_recorded';

export interface ToolkitItemDetail {
  toolkitItemId: string;
  toolkitId: string;
  itemNameEn: string;
  itemNameHi: string | null;
  /** ToolkitItem.distributionBasis — 'individual' | 'group'. */
  distributionPattern: string;
  /** Catalogue default (ToolkitItem.defaultGroupSize) — only meaningful when pattern = 'group'. Never a historical actual. */
  defaultGroupSize: number | null;
  /** Catalogue default (ToolkitItem.defaultQuantityPerUnit) — paired with `unit`. Never a historical actual. */
  defaultQuantityPerUnit: number | null;
  unit: string | null;
  status: ToolkitItemStatus;
}

/** `applicable = false` means no toolkit is attached to this scope at all — render as "N/A", not an empty table. */
export interface ToolkitInfo {
  applicable: boolean;
  items: ToolkitItemDetail[];
}

export interface MissingDataCounts {
  /** Rows in scope with finalParticipantCount IS NULL. Never folded into the participant sum. */
  missingAttendance: number;
  missingDistrict?: number;
  missingBlock?: number;
}

export interface FinancialYearOption {
  id: string;
  label: string;
  /** ISO YYYY-MM-DD */
  startDate: string;
  /** ISO YYYY-MM-DD */
  endDate: string;
  isCurrent: boolean;
  /** True only for the single synthetic "All Financial Years" row — never the current FY, never a real period. */
  isAllYearsAggregate: boolean;
}

export interface AppliedFilters {
  financialYearId: string;
  financialYearLabel: string;
  programmeIds: string[];
  districtIds: string[];
  blockIds: string[];
  eventTypeIds: string[];
  commodityIds: string[];
  /** District report only: also include events with no linked programme. */
  includeUnassignedProgramme: boolean;
}

export interface ChartDatum {
  key: string;
  label: string;
  /** null = unavailable/unknown (e.g. all-missing block data) — a chart MUST distinguish this from 0. */
  value: number | null;
}

export type ChartMeasure = 'completed_events' | 'recorded_participants';

export interface ChartDataset {
  measure: ChartMeasure;
  unit: string;
  data: ChartDatum[];
  /** True when every datum in this dataset is null (all-missing) — UI must show an explanation, not a misleading empty chart. */
  allUnavailable: boolean;
}

// ── Programme Report ────────────────────────────────────────────────────────────────────────────
export interface ProgrammeDistrictDrilldown {
  districtId: string | null;
  districtNameEn: string;
  blocksReached: number;
  completedEvents: number;
  recordedParticipants: number | null;
  missing: MissingDataCounts;
  toolkit: ToolkitInfo;
}

export interface ProgrammeReportRow {
  programmeSchemeId: string;
  programmeNameEn: string;
  targetCommoditiesEn: string[];
  districtsReached: number;
  completedEvents: number;
  recordedParticipants: number | null;
  missing: MissingDataCounts;
  toolkit: ToolkitInfo;
  districtDrilldown: ProgrammeDistrictDrilldown[];
}

// ── District Activity Coverage ──────────────────────────────────────────────────────────────────
export interface DistrictProgrammeBreakdown {
  programmeSchemeId: string | null;
  programmeNameEn: string; // 'Programme not assigned' when null
  completedEvents: number;
  blocksReached: number;
  recordedParticipants: number | null;
  missing: MissingDataCounts;
}

export interface DistrictBlockBreakdown {
  blockId: string | null;
  blockNameEn: string; // 'Block not recorded' when null
  completedEvents: number;
  recordedParticipants: number | null;
  missing: MissingDataCounts;
}

export interface DistrictEventTypeBreakdown {
  eventTypeId: string;
  eventTypeNameEn: string;
  completedEvents: number;
  recordedParticipants: number | null;
  missing: MissingDataCounts;
}

export interface DistrictReportRow {
  districtId: string | null;
  districtNameEn: string; // 'Not recorded' when null — preserved as an explicit group, never dropped
  blocksReached: number;
  programmesCovered: number;
  completedEvents: number;
  recordedParticipants: number | null;
  missing: MissingDataCounts;
  toolkit: ToolkitInfo;
  programmeBreakdown: DistrictProgrammeBreakdown[];
  blockBreakdown: DistrictBlockBreakdown[];
  eventTypeBreakdown: DistrictEventTypeBreakdown[];
}

// ── Commodity-wise Report ───────────────────────────────────────────────────────────────────────
export interface CommodityDistrictBreakdown {
  districtId: string | null;
  districtNameEn: string;
  completedEvents: number;
  blocksReached: number;
  recordedParticipants: number | null;
  missing: MissingDataCounts;
}

export interface CommodityBlockBreakdown {
  districtId: string | null;
  districtNameEn: string;
  blockId: string | null;
  blockNameEn: string;
  completedEvents: number;
  recordedParticipants: number | null;
  missing: MissingDataCounts;
}

export interface CommodityEventTypeBreakdown {
  eventTypeId: string;
  eventTypeNameEn: string;
  completedEvents: number;
  recordedParticipants: number | null;
  missing: MissingDataCounts;
}

export interface CommodityReportRow {
  commodityId: string;
  commodityNameEn: string;
  districtsReached: number;
  completedEvents: number;
  recordedParticipants: number | null;
  missing: MissingDataCounts;
  toolkit: ToolkitInfo;
  districtBreakdown: CommodityDistrictBreakdown[];
  blockBreakdown: CommodityBlockBreakdown[];
  eventTypeBreakdown: CommodityEventTypeBreakdown[];
}

export type ReportRow = ProgrammeReportRow | DistrictReportRow | CommodityReportRow;

export interface ReportResult<Row extends ReportRow = ReportRow> {
  reportKey: ReportKey;
  scope: ReportScope;
  financialYear: FinancialYearOption;
  appliedFilters: AppliedFilters;
  rows: Row[];
  chart: ChartDataset;
  /** Calculation/contract version — bump on any change to query logic or shape. Stored in publication snapshots. */
  calculationVersion: number;
  generatedAt: string;
}

export interface FilterOptions {
  financialYears: FinancialYearOption[];
  programmes: { id: string; nameEn: string }[];
  districts: { id: string; nameEn: string }[];
  blocks: { id: string; nameEn: string; districtId: string }[];
  eventTypes: { id: string; nameEn: string }[];
  commodities: { id: string; nameEn: string }[];
}

export const REPORT_CALCULATION_VERSION = 1;
