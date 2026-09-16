/**
 * Orchestrates FY resolution, filter normalization, and shaping of `reports.repository.ts` output
 * into the shared `ReportResult` contract (reports.types.ts). No Prisma calls here — the repository
 * is the module's only Prisma caller.
 */
import { ValidationError } from '@/shared/errors';
import { reportsRepository, type ToolkitItemGroupCountRow } from './reports.repository';
import { computeToolkitItemStatus } from './reports.toolkit-status';
import type {
  AppliedFilters,
  ChartDataset,
  ChartMeasure,
  CommodityReportRow,
  DistrictReportRow,
  FilterOptions,
  FinancialYearOption,
  MissingDataCounts,
  ProgrammeReportRow,
  ReportResult,
  ToolkitInfo,
  ToolkitItemDetail,
} from './reports.types';
import { REPORT_CALCULATION_VERSION } from './reports.types';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function todayInKolkata(): Date {
  const now = new Date();
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toFinancialYearOption(
  fy: { id: string; label: string; startDate: Date; endDate: Date; isAllYearsAggregate?: boolean },
  isCurrent: boolean,
): FinancialYearOption {
  return {
    id: fy.id,
    label: fy.label,
    startDate: toIsoDate(fy.startDate),
    endDate: toIsoDate(fy.endDate),
    isCurrent,
    isAllYearsAggregate: fy.isAllYearsAggregate === true,
  };
}

export interface RawFilterInput {
  financialYearId?: string;
  programmeIds?: string[];
  districtIds?: string[];
  blockIds?: string[];
  eventTypeIds?: string[];
  commodityIds?: string[];
  includeUnassignedProgramme?: boolean;
}

function dedupe(ids?: string[]): string[] {
  return ids && ids.length > 0 ? Array.from(new Set(ids)) : [];
}

/** Resolves the selected FY, defaulting to the unambiguous current FY when none is given. */
async function resolveFinancialYear(financialYearId: string | undefined): Promise<{
  option: FinancialYearOption;
  startDate: Date;
  endDate: Date;
}> {
  if (financialYearId) {
    const fy = await reportsRepository.findFinancialYearById(financialYearId);
    if (!fy) throw new ValidationError({ financialYearId: ['Unknown financial year.'] });
    const currentCandidates = await reportsRepository.findCurrentFinancialYears(todayInKolkata());
    const isCurrent = currentCandidates.length === 1 && currentCandidates[0]!.id === fy.id;
    return { option: toFinancialYearOption(fy, isCurrent), startDate: fy.startDate, endDate: fy.endDate };
  }
  const candidates = await reportsRepository.findCurrentFinancialYears(todayInKolkata());
  if (candidates.length === 0) {
    throw new ValidationError({
      financialYearId: ['No active financial year covers today\'s date. Select a financial year explicitly.'],
    });
  }
  if (candidates.length > 1) {
    throw new ValidationError({
      financialYearId: [
        `Ambiguous current financial year: ${candidates.length} active financial years cover today's date. Select one explicitly.`,
      ],
    });
  }
  const fy = candidates[0]!;
  return { option: toFinancialYearOption(fy, true), startDate: fy.startDate, endDate: fy.endDate };
}

async function listFilterOptions(): Promise<FilterOptions> {
  const [financialYears, programmes, districts, blocks, eventTypes, commodities] = await Promise.all([
    reportsRepository.listFinancialYears(),
    reportsRepository.listProgrammeOptions(),
    reportsRepository.listDistrictOptions(),
    reportsRepository.listBlockOptions(),
    reportsRepository.listEventTypeOptions(),
    reportsRepository.listCommodityOptions(),
  ]);
  const today = todayInKolkata();
  const sortedFinancialYears = [...financialYears].sort((a, b) => {
    if (a.isAllYearsAggregate !== b.isAllYearsAggregate) return a.isAllYearsAggregate ? -1 : 1;
    return b.startDate.getTime() - a.startDate.getTime();
  });
  return {
    financialYears: sortedFinancialYears.map((fy) =>
      toFinancialYearOption(fy, !fy.isAllYearsAggregate && fy.isActive && fy.startDate <= today && fy.endDate >= today),
    ),
    programmes: programmes.map((p) => ({ id: p.id, nameEn: p.titleEn })),
    districts: districts.map((d) => ({ id: d.id, nameEn: d.nameEn })),
    blocks: blocks.map((b) => ({ id: b.id, nameEn: b.nameEn, districtId: b.districtId })),
    eventTypes: eventTypes.map((t) => ({ id: t.id, nameEn: t.nameEn })),
    commodities: commodities.map((c) => ({ id: c.id, nameEn: c.nameEn })),
  };
}

function buildToolkitInfo(
  applicable: boolean,
  rows: ToolkitItemGroupCountRow[],
): ToolkitInfo {
  const items: ToolkitItemDetail[] = rows.map((r) => ({
    toolkitItemId: r.toolkitItemId,
    toolkitId: r.toolkitId,
    itemNameEn: r.itemNameEn,
    itemNameHi: r.itemNameHi,
    distributionPattern: r.distributionPattern,
    defaultGroupSize: r.defaultGroupSize,
    defaultQuantityPerUnit: r.defaultQuantityPerUnit === null ? null : Number(r.defaultQuantityPerUnit),
    unit: r.unit,
    status: computeToolkitItemStatus({ evidenceCount: r.evidenceCount, distributedCount: r.distributedCount }),
  }));
  return { applicable, items };
}

function buildChart(
  measure: ChartMeasure,
  entries: { key: string; label: string; completedEvents: number; recordedParticipants: number | null }[],
): ChartDataset {
  const unit = measure === 'completed_events' ? 'events' : 'attendees';
  const data = entries.map((e) => ({
    key: e.key,
    label: e.label,
    value: measure === 'completed_events' ? e.completedEvents : e.recordedParticipants,
  }));
  return { measure, unit, data, allUnavailable: data.length > 0 && data.every((d) => d.value === null) };
}

function toAppliedFilters(fy: FinancialYearOption, input: RawFilterInput): AppliedFilters {
  return {
    financialYearId: fy.id,
    financialYearLabel: fy.label,
    programmeIds: dedupe(input.programmeIds),
    districtIds: dedupe(input.districtIds),
    blockIds: dedupe(input.blockIds),
    eventTypeIds: dedupe(input.eventTypeIds),
    commodityIds: dedupe(input.commodityIds),
    includeUnassignedProgramme: input.includeUnassignedProgramme === true,
  };
}

// ── Programme Report ──────────────────────────────────────────────────────────────────────────
async function generateProgrammeReport(input: RawFilterInput): Promise<ReportResult<ProgrammeReportRow>> {
  const fy = await resolveFinancialYear(input.financialYearId);
  const filters = {
    districtIds: dedupe(input.districtIds),
    blockIds: dedupe(input.blockIds),
    eventTypeIds: dedupe(input.eventTypeIds),
    programmeIds: dedupe(input.programmeIds),
  };

  const [summary, drilldown, toolkitByProgramme, toolkitByDistrict, programmesWithToolkit] = await Promise.all([
    reportsRepository.programmeReportSummary(fy.startDate, fy.endDate, filters),
    reportsRepository.programmeDistrictDrilldown(fy.startDate, fy.endDate, filters),
    reportsRepository.programmeToolkitItems(fy.startDate, fy.endDate, filters),
    reportsRepository.programmeToolkitItemsByDistrict(fy.startDate, fy.endDate, filters),
    reportsRepository.programmeIdsWithToolkit(filters.programmeIds),
  ]);

  const rows: ProgrammeReportRow[] = summary.map((s) => {
    const districtDrilldown = drilldown
      .filter((d) => d.programmeSchemeId === s.programmeSchemeId)
      .map((d) => {
        const districtToolkitRows = toolkitByDistrict.filter(
          (t) => t.groupKey === s.programmeSchemeId && (t.groupDistrictId ?? null) === d.districtId,
        );
        const missing: MissingDataCounts = { missingAttendance: d.missingAttendance, missingBlock: d.missingBlock };
        return {
          districtId: d.districtId,
          districtNameEn: d.districtNameEn ?? 'Not recorded',
          blocksReached: d.blocksReached,
          completedEvents: d.completedEvents,
          recordedParticipants: d.recordedParticipants,
          missing,
          toolkit: buildToolkitInfo(programmesWithToolkit.has(s.programmeSchemeId), districtToolkitRows),
        };
      });

    const missing: MissingDataCounts = { missingAttendance: s.missingAttendance, missingDistrict: s.missingDistrict };
    return {
      programmeSchemeId: s.programmeSchemeId,
      programmeNameEn: s.programmeNameEn,
      targetCommoditiesEn: s.targetCommoditiesEn,
      districtsReached: s.districtsReached,
      completedEvents: s.completedEvents,
      recordedParticipants: s.recordedParticipants,
      missing,
      toolkit: buildToolkitInfo(
        programmesWithToolkit.has(s.programmeSchemeId),
        toolkitByProgramme.filter((t) => t.groupKey === s.programmeSchemeId),
      ),
      districtDrilldown,
    };
  });

  const appliedFilters = toAppliedFilters(fy.option, input);
  const chart = buildChart(
    'completed_events',
    rows.map((r) => ({
      key: r.programmeSchemeId,
      label: r.programmeNameEn,
      completedEvents: r.completedEvents,
      recordedParticipants: r.recordedParticipants,
    })),
  );

  return {
    reportKey: 'programme_report',
    scope: 'cms_operational',
    financialYear: fy.option,
    appliedFilters,
    rows,
    chart,
    calculationVersion: REPORT_CALCULATION_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

// ── District Activity Coverage ────────────────────────────────────────────────────────────────
async function generateDistrictReport(input: RawFilterInput): Promise<ReportResult<DistrictReportRow>> {
  const fy = await resolveFinancialYear(input.financialYearId);
  const filters = {
    districtIds: dedupe(input.districtIds),
    blockIds: dedupe(input.blockIds),
    eventTypeIds: dedupe(input.eventTypeIds),
    programmeIds: dedupe(input.programmeIds),
    includeUnassignedProgramme: input.includeUnassignedProgramme === true,
  };

  const [summary, programmeBreakdown, blockBreakdown, eventTypeBreakdown, toolkitByDistrict] = await Promise.all([
    reportsRepository.districtReportSummary(fy.startDate, fy.endDate, filters),
    reportsRepository.districtProgrammeBreakdown(fy.startDate, fy.endDate, filters),
    reportsRepository.districtBlockBreakdown(fy.startDate, fy.endDate, filters),
    reportsRepository.districtEventTypeBreakdown(fy.startDate, fy.endDate, filters),
    reportsRepository.districtToolkitItems(fy.startDate, fy.endDate, filters),
  ]);

  const rows: DistrictReportRow[] = summary.map((s) => {
    const key = s.districtId ?? '';
    const districtToolkitRows = toolkitByDistrict.filter((t) => t.groupKey === key);
    return {
      districtId: s.districtId,
      districtNameEn: s.districtNameEn ?? 'Not recorded',
      blocksReached: s.blocksReached,
      programmesCovered: s.programmesCovered,
      completedEvents: s.completedEvents,
      recordedParticipants: s.recordedParticipants,
      missing: { missingAttendance: s.missingAttendance, missingBlock: s.missingBlock },
      toolkit: buildToolkitInfo(districtToolkitRows.length > 0, districtToolkitRows),
      programmeBreakdown: programmeBreakdown
        .filter((p) => (p.districtId ?? null) === s.districtId)
        .map((p) => ({
          programmeSchemeId: p.programmeSchemeId,
          programmeNameEn: p.programmeNameEn ?? 'Programme not assigned',
          completedEvents: p.completedEvents,
          blocksReached: p.blocksReached,
          recordedParticipants: p.recordedParticipants,
          missing: { missingAttendance: p.missingAttendance },
        })),
      blockBreakdown: blockBreakdown
        .filter((b) => (b.districtId ?? null) === s.districtId)
        .map((b) => ({
          blockId: b.blockId,
          blockNameEn: b.blockNameEn ?? 'Block not recorded',
          completedEvents: b.completedEvents,
          recordedParticipants: b.recordedParticipants,
          missing: { missingAttendance: b.missingAttendance },
        })),
      eventTypeBreakdown: eventTypeBreakdown
        .filter((e) => (e.districtId ?? null) === s.districtId)
        .map((e) => ({
          eventTypeId: e.eventTypeId,
          eventTypeNameEn: e.eventTypeNameEn,
          completedEvents: e.completedEvents,
          recordedParticipants: e.recordedParticipants,
          missing: { missingAttendance: e.missingAttendance },
        })),
    };
  });

  const appliedFilters = toAppliedFilters(fy.option, input);
  const chart = buildChart(
    'completed_events',
    rows.map((r) => ({
      key: r.districtId ?? 'not_recorded',
      label: r.districtNameEn,
      completedEvents: r.completedEvents,
      recordedParticipants: r.recordedParticipants,
    })),
  );

  return {
    reportKey: 'district_activity_coverage',
    scope: 'cms_operational',
    financialYear: fy.option,
    appliedFilters,
    rows,
    chart,
    calculationVersion: REPORT_CALCULATION_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

// ── Commodity-wise Report ─────────────────────────────────────────────────────────────────────
async function generateCommodityReport(input: RawFilterInput): Promise<ReportResult<CommodityReportRow>> {
  const fy = await resolveFinancialYear(input.financialYearId);
  const filters = {
    districtIds: dedupe(input.districtIds),
    blockIds: dedupe(input.blockIds),
    eventTypeIds: dedupe(input.eventTypeIds),
    commodityIds: dedupe(input.commodityIds),
  };

  const [summary, districtBreakdown, blockBreakdown, eventTypeBreakdown, toolkitByCommodity, commoditiesWithToolkit] =
    await Promise.all([
      reportsRepository.commodityReportSummary(fy.startDate, fy.endDate, filters),
      reportsRepository.commodityDistrictBreakdown(fy.startDate, fy.endDate, filters),
      reportsRepository.commodityBlockBreakdown(fy.startDate, fy.endDate, filters),
      reportsRepository.commodityEventTypeBreakdown(fy.startDate, fy.endDate, filters),
      reportsRepository.commodityToolkitItems(fy.startDate, fy.endDate, filters),
      reportsRepository.commodityIdsWithToolkit(filters.commodityIds),
    ]);

  const rows: CommodityReportRow[] = summary.map((s) => ({
    commodityId: s.commodityId,
    commodityNameEn: s.commodityNameEn,
    districtsReached: s.districtsReached,
    completedEvents: s.completedEvents,
    recordedParticipants: s.recordedParticipants,
    missing: { missingAttendance: s.missingAttendance },
    toolkit: buildToolkitInfo(
      commoditiesWithToolkit.has(s.commodityId),
      toolkitByCommodity.filter((t) => t.groupKey === s.commodityId),
    ),
    districtBreakdown: districtBreakdown
      .filter((d) => d.commodityId === s.commodityId)
      .map((d) => ({
        districtId: d.districtId,
        districtNameEn: d.districtNameEn ?? 'District not recorded',
        completedEvents: d.completedEvents,
        blocksReached: d.blocksReached,
        recordedParticipants: d.recordedParticipants,
        missing: { missingAttendance: d.missingAttendance },
      })),
    blockBreakdown: blockBreakdown
      .filter((b) => b.commodityId === s.commodityId)
      .map((b) => ({
        districtId: b.districtId,
        districtNameEn: b.districtNameEn ?? 'District not recorded',
        blockId: b.blockId,
        blockNameEn: b.blockNameEn ?? 'Block not recorded',
        completedEvents: b.completedEvents,
        recordedParticipants: b.recordedParticipants,
        missing: { missingAttendance: b.missingAttendance },
      })),
    eventTypeBreakdown: eventTypeBreakdown
      .filter((e) => e.commodityId === s.commodityId)
      .map((e) => ({
        eventTypeId: e.eventTypeId,
        eventTypeNameEn: e.eventTypeNameEn,
        completedEvents: e.completedEvents,
        recordedParticipants: e.recordedParticipants,
        missing: { missingAttendance: e.missingAttendance },
      })),
  }));

  const appliedFilters = toAppliedFilters(fy.option, input);
  const chart = buildChart(
    'completed_events',
    rows.map((r) => ({
      key: r.commodityId,
      label: r.commodityNameEn,
      completedEvents: r.completedEvents,
      recordedParticipants: r.recordedParticipants,
    })),
  );

  return {
    reportKey: 'commodity_report',
    scope: 'cms_operational',
    financialYear: fy.option,
    appliedFilters,
    rows,
    chart,
    calculationVersion: REPORT_CALCULATION_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

async function generate(reportKey: string, input: RawFilterInput): Promise<ReportResult> {
  switch (reportKey) {
    case 'programme_report':
      return generateProgrammeReport(input);
    case 'district_activity_coverage':
      return generateDistrictReport(input);
    case 'commodity_report':
      return generateCommodityReport(input);
    default:
      throw new ValidationError({ reportKey: [`Unknown report key "${reportKey}".`] });
  }
}

export const reportsService = {
  listFilterOptions,
  resolveFinancialYear,
  generate,
  generateProgrammeReport,
  generateDistrictReport,
  generateCommodityReport,
};
