/**
 * The ONLY Prisma caller for the Operational Reports module (coding-standards §6). One aggregation
 * function per report, computed DB-side (`groupBy`/`aggregate`/`count`) — never loaded into memory
 * in full and reduced in JS (mirrors `aggregateForToolkit` in
 * `src/modules/events/toolkit-distributions/toolkit-distributions.service.ts`).
 *
 * Scope rule applied everywhere by default: `publicationState = 'published' AND archivedAt IS NULL`
 * (the operational default scope). Many-to-many filters (programme/commodity) are applied as
 * relation `some` filters directly against the parent model (`Event.programmes.some({...})`) rather
 * than by querying the join table and deduplicating — Prisma returns one row per parent regardless
 * of how many join rows match, so this avoids the join-inflation problem structurally.
 */
import { Prisma, type EventStatus } from '@prisma/client';
import { prisma } from '@/db/prisma';
import type { ResolvedPeriod } from './operational-reports.types';

type Filters = Record<string, string[] | undefined>;

function ids(filters: Filters, key: string): string[] | undefined {
  const v = filters[key];
  return v && v.length > 0 ? v : undefined;
}

const PUBLISHED_SCOPE = { publicationState: 'published' as const, archivedAt: null };

function periodRange(period: ResolvedPeriod): { gte: Date; lte: Date } {
  return { gte: period.start, lte: period.end };
}

// ── FinancialYear lookups (used by operational-reports.period.ts; kept here so the repository
// remains the module's only Prisma caller). ──────────────────────────────────────────────────
function findFinancialYearByLabel(label: string) {
  return prisma.financialYear.findUnique({ where: { label } });
}

function findActiveFinancialYearsCovering(date: Date) {
  return prisma.financialYear.findMany({
    where: { isActive: true, startDate: { lte: date }, endDate: { gte: date } },
  });
}

// ── event_activity_outcomes ─────────────────────────────────────────────────────────────────
function eventOutcomesWhere(period: ResolvedPeriod, filters: Filters): Prisma.EventWhereInput {
  return {
    ...PUBLISHED_SCOPE,
    startDate: periodRange(period),
    districtId: ids(filters, 'districtId') ? { in: ids(filters, 'districtId') } : undefined,
    blockId: ids(filters, 'blockId') ? { in: ids(filters, 'blockId') } : undefined,
    eventTypeId: ids(filters, 'eventTypeId') ? { in: ids(filters, 'eventTypeId') } : undefined,
    eventStatus: ids(filters, 'eventStatus')
      ? { in: ids(filters, 'eventStatus') as EventStatus[] }
      : undefined,
  };
}

async function eventActivityOutcomesSummary(period: ResolvedPeriod, filters: Filters) {
  const where = eventOutcomesWhere(period, filters);
  const [totalEvents, completedEvents, overdueIncomplete] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.count({ where: { ...where, eventStatus: 'completed' } }),
    prisma.event.count({
      where: {
        ...PUBLISHED_SCOPE,
        districtId: ids(filters, 'districtId') ? { in: ids(filters, 'districtId') } : undefined,
        blockId: ids(filters, 'blockId') ? { in: ids(filters, 'blockId') } : undefined,
        eventTypeId: ids(filters, 'eventTypeId') ? { in: ids(filters, 'eventTypeId') } : undefined,
        endDate: { lt: new Date() },
        eventStatus: { not: 'completed' },
      },
    }),
  ]);
  return { totalEvents, completedEvents, overdueIncomplete };
}

async function eventActivityOutcomesRows(
  period: ResolvedPeriod,
  filters: Filters,
  skip: number,
  take: number,
) {
  const where = eventOutcomesWhere(period, filters);
  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startDate: 'desc' },
      skip,
      take,
      select: {
        id: true,
        titleEn: true,
        startDate: true,
        endDate: true,
        completedDate: true,
        eventStatus: true,
        districtId: true,
        blockId: true,
        outcomeSummaryEn: true,
        completionRemarksEn: true,
      },
    }),
    prisma.event.count({ where }),
  ]);
  return { items, total };
}

// ── training_attendance ──────────────────────────────────────────────────────────────────────
function trainingWhere(period: ResolvedPeriod, filters: Filters): Prisma.EventWhereInput {
  return {
    ...PUBLISHED_SCOPE,
    startDate: periodRange(period),
    districtId: ids(filters, 'districtId') ? { in: ids(filters, 'districtId') } : undefined,
    blockId: ids(filters, 'blockId') ? { in: ids(filters, 'blockId') } : undefined,
    eventType: { eventCategory: { slug: 'trainings' } },
  };
}

async function trainingAttendanceSummary(period: ResolvedPeriod, filters: Filters) {
  const where = trainingWhere(period, filters);
  const completedWhere = { ...where, eventStatus: 'completed' as const };
  const [completedTrainingCount, attendanceKnown, attendanceMissing] = await Promise.all([
    prisma.event.count({ where: completedWhere }),
    prisma.event.aggregate({
      where: { ...completedWhere, finalParticipantCount: { not: null } },
      _sum: { finalParticipantCount: true },
      _count: { _all: true },
    }),
    prisma.event.count({ where: { ...completedWhere, finalParticipantCount: null } }),
  ]);
  return {
    completedTrainingCount,
    recordedAttendance: attendanceKnown._sum.finalParticipantCount,
    attendanceKnownCount: attendanceKnown._count._all,
    attendanceMissingCount: attendanceMissing,
  };
}

async function trainingAttendanceRows(
  period: ResolvedPeriod,
  filters: Filters,
  skip: number,
  take: number,
) {
  const where = trainingWhere(period, filters);
  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startDate: 'desc' },
      skip,
      take,
      select: {
        id: true,
        titleEn: true,
        startDate: true,
        eventStatus: true,
        eventTypeId: true,
        districtId: true,
        finalParticipantCount: true,
      },
    }),
    prisma.event.count({ where }),
  ]);
  return { items, total };
}

// ── programme_activity_coverage ─────────────────────────────────────────────────────────────
async function programmeIdsInScope(period: ResolvedPeriod, filters: Filters): Promise<string[]> {
  const requested = ids(filters, 'programmeSchemeId');
  if (requested) return requested;
  const rows = await prisma.eventProgramme.findMany({
    where: { event: { ...PUBLISHED_SCOPE, startDate: periodRange(period) } },
    distinct: ['programmeSchemeId'],
    select: { programmeSchemeId: true },
  });
  return rows.map((r) => r.programmeSchemeId);
}

async function programmeActivityCoverage(period: ResolvedPeriod, filters: Filters) {
  const programmeSchemeIds = await programmeIdsInScope(period, filters);
  const results = await Promise.all(
    programmeSchemeIds.map(async (programmeSchemeId) => {
      const baseWhere: Prisma.EventWhereInput = {
        ...PUBLISHED_SCOPE,
        startDate: periodRange(period),
        programmes: { some: { programmeSchemeId } },
      };
      const [totalEvents, completedAgg, districtRows] = await Promise.all([
        prisma.event.count({ where: baseWhere }),
        prisma.event.aggregate({
          where: { ...baseWhere, eventStatus: 'completed' },
          _count: { _all: true },
          _sum: { finalParticipantCount: true },
        }),
        prisma.event.findMany({
          where: { ...baseWhere, districtId: { not: null } },
          distinct: ['districtId'],
          select: { districtId: true },
        }),
      ]);
      return {
        programmeSchemeId,
        totalEvents,
        completedEvents: completedAgg._count._all,
        attendanceFromCompleted: completedAgg._sum.finalParticipantCount,
        distinctKnownDistricts: districtRows.length,
      };
    }),
  );
  return results;
}

// ── district_activity_coverage ──────────────────────────────────────────────────────────────
function districtWhere(period: ResolvedPeriod, filters: Filters): Prisma.EventWhereInput {
  return {
    ...PUBLISHED_SCOPE,
    startDate: periodRange(period),
    districtId: ids(filters, 'districtId') ? { in: ids(filters, 'districtId') } : undefined,
    blockId: ids(filters, 'blockId') ? { in: ids(filters, 'blockId') } : undefined,
  };
}

async function districtActivityCoverage(period: ResolvedPeriod, filters: Filters) {
  const where = districtWhere(period, filters);
  const [totalGroups, completedGroups] = await Promise.all([
    prisma.event.groupBy({ by: ['districtId'], where, _count: { _all: true } }),
    prisma.event.groupBy({
      by: ['districtId'],
      where: { ...where, eventStatus: 'completed' },
      _count: { _all: true },
      _sum: { finalParticipantCount: true },
    }),
  ]);
  return { totalGroups, completedGroups };
}

// ── toolkit_item_distribution ────────────────────────────────────────────────────────────────
function toolkitSummaryWhere(
  period: ResolvedPeriod,
  filters: Filters,
): Prisma.ToolkitDistributionSummaryWhereInput {
  return {
    distributionDone: true,
    distributionDate: periodRange(period),
    toolkitId: ids(filters, 'toolkitId') ? { in: ids(filters, 'toolkitId') } : undefined,
    event: {
      ...PUBLISHED_SCOPE,
      districtId: ids(filters, 'districtId') ? { in: ids(filters, 'districtId') } : undefined,
    },
  };
}

async function toolkitDistributionSummary(period: ResolvedPeriod, filters: Filters) {
  const where = toolkitSummaryWhere(period, filters);
  const undatedWhere: Prisma.ToolkitDistributionSummaryWhereInput = {
    distributionDone: true,
    distributionDate: null,
    toolkitId: ids(filters, 'toolkitId') ? { in: ids(filters, 'toolkitId') } : undefined,
    event: {
      ...PUBLISHED_SCOPE,
      districtId: ids(filters, 'districtId') ? { in: ids(filters, 'districtId') } : undefined,
    },
  };
  const [completedDistributions, participantsAgg, participantsMissing, undated] =
    await Promise.all([
      prisma.toolkitDistributionSummary.count({ where }),
      prisma.toolkitDistributionSummary.aggregate({
        where: { ...where, participantsCovered: { not: null } },
        _sum: { participantsCovered: true },
        _count: { _all: true },
      }),
      prisma.toolkitDistributionSummary.count({ where: { ...where, participantsCovered: null } }),
      prisma.toolkitDistributionSummary.count({ where: undatedWhere }),
    ]);

  const itemTotals = await prisma.toolkitDistributionItem.groupBy({
    by: ['toolkitItemId'],
    where: { summary: where },
    _sum: { totalQuantity: true },
    _count: { _all: true },
  });
  const itemsMissingQuantity = await prisma.toolkitDistributionItem.count({
    where: { summary: where, totalQuantity: null },
  });
  const itemIds = itemTotals.map((t) => t.toolkitItemId);
  const itemMeta = itemIds.length
    ? await prisma.toolkitItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, nameEn: true, nameHi: true, unit: true },
      })
    : [];

  return {
    completedDistributions,
    participantsCovered: participantsAgg._sum.participantsCovered,
    participantsKnownCount: participantsAgg._count._all,
    participantsMissingCount: participantsMissing,
    undatedDistributions: undated,
    itemTotals,
    itemMeta,
    itemsMissingQuantity,
  };
}

async function toolkitDistributionRows(
  period: ResolvedPeriod,
  filters: Filters,
  skip: number,
  take: number,
) {
  const where = toolkitSummaryWhere(period, filters);
  const [items, total] = await Promise.all([
    prisma.toolkitDistributionSummary.findMany({
      where,
      orderBy: { distributionDate: 'desc' },
      skip,
      take,
      select: {
        id: true,
        eventId: true,
        toolkitId: true,
        distributionDate: true,
        distributionModel: true,
        participantsCovered: true,
      },
    }),
    prisma.toolkitDistributionSummary.count({ where }),
  ]);
  return { items, total };
}

// ── procurement_register ─────────────────────────────────────────────────────────────────────
function procurementWhere(
  period: ResolvedPeriod,
  filters: Filters,
): Prisma.ProcurementUpdateWhereInput {
  return {
    ...PUBLISHED_SCOPE,
    effectiveDate: periodRange(period),
    commodityId: ids(filters, 'commodityId') ? { in: ids(filters, 'commodityId') } : undefined,
    procurementUpdateTypeId: ids(filters, 'procurementUpdateTypeId')
      ? { in: ids(filters, 'procurementUpdateTypeId') }
      : undefined,
    districtId: ids(filters, 'districtId') ? { in: ids(filters, 'districtId') } : undefined,
  };
}

async function procurementRegisterSummary(period: ResolvedPeriod, filters: Filters) {
  const where = procurementWhere(period, filters);
  const undatedWhere: Prisma.ProcurementUpdateWhereInput = {
    ...PUBLISHED_SCOPE,
    effectiveDate: null,
    commodityId: ids(filters, 'commodityId') ? { in: ids(filters, 'commodityId') } : undefined,
    procurementUpdateTypeId: ids(filters, 'procurementUpdateTypeId')
      ? { in: ids(filters, 'procurementUpdateTypeId') }
      : undefined,
    districtId: ids(filters, 'districtId') ? { in: ids(filters, 'districtId') } : undefined,
  };

  const [pricedUpdateCount, undated] = await Promise.all([
    prisma.procurementUpdate.count({ where: { ...where, rate: { not: null } } }),
    prisma.procurementUpdate.count({ where: undatedWhere }),
  ]);

  const groups = await prisma.procurementUpdate.groupBy({
    by: ['commodityId', 'procurementUpdateTypeId', 'unit'],
    where: { ...where, rate: { not: null } },
    _min: { rate: true },
    _max: { rate: true },
    _count: { _all: true },
  });

  // "Latest" per group (greatest effectiveDate; ties flagged) — bounded by the number of distinct
  // commodity+type+unit groups (a small, fixed taxonomy), not the full procurement table.
  const latestByGroup = await Promise.all(
    groups.map(async (g) => {
      const latestDate = await prisma.procurementUpdate.aggregate({
        where: {
          ...where,
          rate: { not: null },
          commodityId: g.commodityId,
          procurementUpdateTypeId: g.procurementUpdateTypeId,
          unit: g.unit,
        },
        _max: { effectiveDate: true },
      });
      const maxDate = latestDate._max.effectiveDate;
      if (!maxDate) return { ...g, latestRate: null, latestEffectiveDate: null, tie: false };
      const atMax = await prisma.procurementUpdate.findMany({
        where: {
          ...where,
          rate: { not: null },
          commodityId: g.commodityId,
          procurementUpdateTypeId: g.procurementUpdateTypeId,
          unit: g.unit,
          effectiveDate: maxDate,
        },
        select: { rate: true },
      });
      return {
        ...g,
        latestEffectiveDate: maxDate,
        latestRate: atMax[0]?.rate ?? null,
        tie: atMax.length > 1,
      };
    }),
  );

  return { pricedUpdateCount, undated, groups: latestByGroup };
}

async function procurementRegisterRows(
  period: ResolvedPeriod,
  filters: Filters,
  skip: number,
  take: number,
) {
  const where = procurementWhere(period, filters);
  const [items, total] = await Promise.all([
    prisma.procurementUpdate.findMany({
      where,
      orderBy: { effectiveDate: 'desc' },
      skip,
      take,
      select: {
        id: true,
        titleEn: true,
        commodityId: true,
        procurementUpdateTypeId: true,
        rate: true,
        unit: true,
        quantity: true,
        displayQuantityAsMt: true,
        effectiveDate: true,
        districtId: true,
      },
    }),
    prisma.procurementUpdate.count({ where }),
  ]);
  return { items, total };
}

export const operationalReportsRepository = {
  findFinancialYearByLabel,
  findActiveFinancialYearsCovering,
  eventActivityOutcomesSummary,
  eventActivityOutcomesRows,
  trainingAttendanceSummary,
  trainingAttendanceRows,
  programmeActivityCoverage,
  districtActivityCoverage,
  toolkitDistributionSummary,
  toolkitDistributionRows,
  procurementRegisterSummary,
  procurementRegisterRows,
};

export type OperationalReportsRepository = typeof operationalReportsRepository;
