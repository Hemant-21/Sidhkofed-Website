/**
 * Builds the XLSX workbook for a Reports export: Summary, main report Data, Toolkit details,
 * Definitions/completeness. Table-based only — no embedded Excel charts (explicitly out of scope).
 * Never includes internal IDs as columns — names/labels only.
 */
import type { XlsxCellValue, XlsxSheet } from '@/utils/xlsx-writer';
import { TOOLKIT_ITEM_STATUS_LABELS } from './reports.toolkit-status';
import type {
  CommodityReportRow,
  DistrictReportRow,
  ProgrammeReportRow,
  ReportResult,
  ToolkitItemDetail,
} from './reports.types';

function buildSummarySheet(result: ReportResult): XlsxSheet {
  const f = result.appliedFilters;
  const rows: XlsxCellValue[][] = [
    ['Report', result.reportKey],
    ['Financial year', result.financialYear.label],
    ['FY start', result.financialYear.startDate],
    ['FY end', result.financialYear.endDate],
    ['Scope', result.scope],
    ['Calculation version', result.calculationVersion],
    ['Generated at', result.generatedAt],
    [],
    ['Applied filters'],
    ['Programme count', f.programmeIds.length],
    ['District count', f.districtIds.length],
    ['Block count', f.blockIds.length],
    ['Event type count', f.eventTypeIds.length],
    ['Commodity count', f.commodityIds.length],
    ['Include "Programme not assigned"', f.includeUnassignedProgramme ? 'Yes' : 'No'],
    [],
    ['Row count', result.rows.length],
  ];
  return { name: 'Summary', rows };
}

function buildProgrammeDataSheet(rows: ProgrammeReportRow[]): XlsxSheet {
  const header = [
    'Programme',
    'Target commodities',
    'Districts reached',
    'Completed events',
    'Recorded participants',
    'Events missing attendance',
    'Events missing district',
  ];
  const body = rows.map((r) => [
    r.programmeNameEn,
    r.targetCommoditiesEn.join(', '),
    r.districtsReached,
    r.completedEvents,
    r.recordedParticipants ?? '',
    r.missing.missingAttendance,
    r.missing.missingDistrict ?? '',
  ]);
  return { name: 'Data', rows: [header, ...body] };
}

function buildDistrictDataSheet(rows: DistrictReportRow[]): XlsxSheet {
  const header = [
    'District',
    'Blocks reached',
    'Programmes covered',
    'Completed events',
    'Recorded participants',
    'Events missing attendance',
    'Events missing block',
  ];
  const body = rows.map((r) => [
    r.districtNameEn,
    r.blocksReached,
    r.programmesCovered,
    r.completedEvents,
    r.recordedParticipants ?? '',
    r.missing.missingAttendance,
    r.missing.missingBlock ?? '',
  ]);
  return { name: 'Data', rows: [header, ...body] };
}

function buildCommodityDataSheet(rows: CommodityReportRow[]): XlsxSheet {
  const header = ['Commodity', 'Districts reached', 'Completed events', 'Recorded participants', 'Events missing attendance'];
  const body = rows.map((r) => [
    r.commodityNameEn,
    r.districtsReached,
    r.completedEvents,
    r.recordedParticipants ?? '',
    r.missing.missingAttendance,
  ]);
  return { name: 'Data', rows: [header, ...body] };
}

function toolkitRowLabel(reportKey: ReportResult['reportKey'], row: { programmeNameEn?: string; districtNameEn?: string; commodityNameEn?: string }): string {
  if (reportKey === 'programme_report') return row.programmeNameEn ?? '';
  if (reportKey === 'district_activity_coverage') return row.districtNameEn ?? '';
  return row.commodityNameEn ?? '';
}

function buildToolkitSheet(result: ReportResult): XlsxSheet {
  const header = [
    result.reportKey === 'programme_report' ? 'Programme' : result.reportKey === 'district_activity_coverage' ? 'District' : 'Commodity',
    'Item',
    'Distribution pattern',
    'Default group size (catalogue)',
    'Default quantity per individual/group (catalogue)',
    'Unit',
    'Status',
  ];
  const body: XlsxCellValue[][] = [];
  for (const row of result.rows) {
    const label = toolkitRowLabel(result.reportKey, row as never);
    if (!row.toolkit.applicable) {
      body.push([label, 'N/A', '', '', '', '', '']);
      continue;
    }
    if (row.toolkit.items.length === 0) {
      body.push([label, 'Not recorded', '', '', '', '', '']);
      continue;
    }
    for (const item of row.toolkit.items as ToolkitItemDetail[]) {
      body.push([
        label,
        item.itemNameEn,
        item.distributionPattern,
        item.defaultGroupSize ?? '',
        item.defaultQuantityPerUnit ?? '',
        item.unit ?? '',
        TOOLKIT_ITEM_STATUS_LABELS[item.status],
      ]);
    }
  }
  return { name: 'Toolkit details', rows: [header, ...body] };
}

function buildDefinitionsSheet(): XlsxSheet {
  const rows: XlsxCellValue[][] = [
    ['Field', 'Definition'],
    ['Completed events', 'Events with eventStatus = completed, startDate within the selected financial year (inclusive), published and non-archived.'],
    ['Recorded participants', 'Sum of finalParticipantCount from completed events with a known (non-null) count. This is recorded attendance, not unique beneficiaries.'],
    ['Events missing attendance', 'Completed events in scope with finalParticipantCount = NULL. Never treated as zero.'],
    ['Districts/blocks reached', 'Distinct known (non-null) districts/blocks among completed events in scope.'],
    ['Not recorded (location)', 'Completed events with no linked district/block — preserved as an explicit group, never dropped.'],
    ['Toolkit status: Distributed', 'Every recorded distribution summary for this item, in scope, is confirmed done with a positive quantity.'],
    ['Toolkit status: Partially distributed', 'Some but not all recorded distribution summaries for this item, in scope, are confirmed done with a positive quantity.'],
    ['Toolkit status: Not distributed', 'Distribution summaries exist for this item, in scope, but none are confirmed done with a positive quantity.'],
    ['Toolkit status: Not recorded', 'No distribution summary evidence exists for this item in scope.'],
    ['Toolkit: N/A', 'No toolkit is attached to this scope at all.'],
    ['Default group size / quantity', 'Catalogue defaults from the toolkit item definition — not a historical actual distributed quantity.'],
  ];
  return { name: 'Definitions', rows };
}

export function buildReportExportSheets(result: ReportResult): XlsxSheet[] {
  const dataSheet =
    result.reportKey === 'programme_report'
      ? buildProgrammeDataSheet(result.rows as ProgrammeReportRow[])
      : result.reportKey === 'district_activity_coverage'
        ? buildDistrictDataSheet(result.rows as DistrictReportRow[])
        : buildCommodityDataSheet(result.rows as CommodityReportRow[]);
  return [buildSummarySheet(result), dataSheet, buildToolkitSheet(result), buildDefinitionsSheet()];
}
