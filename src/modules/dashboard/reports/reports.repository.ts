/**
 * The ONLY Prisma caller for the `reports` module (coding-standards §6). Raw, parameterized SQL is
 * used deliberately for the three main aggregation queries (Programme / District Activity Coverage /
 * Commodity-wise) — the same justification as `search.repository.ts`: these are multi-dimensional
 * cross-tab aggregations (conditional COUNT/SUM with nested per-group JSON breakdowns) that the
 * Prisma query builder cannot express without N+1 round-trips or loading full row sets into memory.
 * Every identifier interpolated into SQL is either a hard-coded constant or passed through
 * `Prisma.join`/bound parameters — never raw string concatenation of user input.
 *
 * These queries extend the validated workspace-root `*-trial.sql` prototypes: full filter support
 * (district/block/event-type/programme/commodity), and toolkit item status is returned as raw
 * evidence/distributed counts (never a pre-baked status string) so the single standardized rule in
 * `reports.toolkit-status.ts` is the only place status is decided.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';

// ── Filter fragment helpers ────────────────────────────────────────────────────────────────────
function inClause(column: string, ids: string[]): Prisma.Sql {
  if (ids.length === 0) return Prisma.sql`TRUE`;
  return Prisma.sql`${Prisma.raw(column)} IN (${Prisma.join(ids)})`;
}

export interface ToolkitItemCountRow {
  toolkitItemId: string;
  toolkitId: string;
  itemNameEn: string;
  itemNameHi: string | null;
  distributionPattern: string;
  defaultGroupSize: number | null;
  defaultQuantityPerUnit: string | null; // Decimal comes back as string from raw SQL
  unit: string | null;
  evidenceCount: number;
  distributedCount: number;
}

// ── Financial years / filter option lookups (plain Prisma, no raw SQL needed) ────────────────────
function listFinancialYears() {
  return prisma.financialYear.findMany({ orderBy: { startDate: 'desc' } });
}

function findCurrentFinancialYears(today: Date) {
  return prisma.financialYear.findMany({
    where: { isActive: true, isAllYearsAggregate: false, startDate: { lte: today }, endDate: { gte: today } },
  });
}

function findFinancialYearById(id: string) {
  return prisma.financialYear.findUnique({ where: { id } });
}

function listProgrammeOptions() {
  return prisma.programmeScheme.findMany({
    where: { publicationState: 'published', archivedAt: null },
    select: { id: true, titleEn: true },
    orderBy: { titleEn: 'asc' },
  });
}

function listDistrictOptions() {
  return prisma.district.findMany({
    where: { isActive: true },
    select: { id: true, nameEn: true },
    orderBy: { nameEn: 'asc' },
  });
}

function listBlockOptions() {
  return prisma.block.findMany({
    where: { isActive: true },
    select: { id: true, nameEn: true, districtId: true },
    orderBy: { nameEn: 'asc' },
  });
}

function listEventTypeOptions() {
  return prisma.eventType.findMany({
    select: { id: true, nameEn: true },
    orderBy: { nameEn: 'asc' },
  });
}

function listCommodityOptions() {
  return prisma.commodity.findMany({
    where: { isActive: true },
    select: { id: true, nameEn: true },
    orderBy: { nameEn: 'asc' },
  });
}

// ── Shared eligible-events predicate ──────────────────────────────────────────────────────────
interface EventScopeFilters {
  districtIds: string[];
  blockIds: string[];
  eventTypeIds: string[];
}

function eligibleEventsCte(
  fyStart: Date,
  fyEnd: Date,
  filters: EventScopeFilters,
): Prisma.Sql {
  return Prisma.sql`
    SELECT e.* FROM events e
    WHERE e.event_status = 'completed'
      AND e.publication_state = 'published' AND e.archived_at IS NULL
      AND e.start_date BETWEEN ${fyStart}::date AND ${fyEnd}::date
      AND ${inClause('e.district_id', filters.districtIds)}
      AND ${inClause('e.block_id', filters.blockIds)}
      AND ${inClause('e.event_type_id', filters.eventTypeIds)}
  `;
}

// ── Programme Report ──────────────────────────────────────────────────────────────────────────
export interface ProgrammeReportFilters extends EventScopeFilters {
  programmeIds: string[];
}

export interface ProgrammeSummaryRow {
  programmeSchemeId: string;
  programmeNameEn: string;
  targetCommoditiesEn: string[];
  completedEvents: number;
  districtsReached: number;
  recordedParticipants: number | null;
  missingAttendance: number;
  missingDistrict: number;
}

export interface ProgrammeDistrictDrilldownRow {
  programmeSchemeId: string;
  districtId: string | null;
  districtNameEn: string | null;
  blocksReached: number;
  completedEvents: number;
  recordedParticipants: number | null;
  missingAttendance: number;
  missingBlock: number;
}

async function programmeReportSummary(
  fyStart: Date,
  fyEnd: Date,
  filters: ProgrammeReportFilters,
): Promise<ProgrammeSummaryRow[]> {
  const rows = await prisma.$queryRaw<
    {
      programme_scheme_id: string;
      programme_name_en: string;
      target_commodities_en: string[] | null;
      completed_events: bigint;
      districts_reached: bigint;
      recorded_participants: number | null;
      missing_attendance: bigint;
      missing_district: bigint;
    }[]
  >(Prisma.sql`
    WITH eligible_events AS (${eligibleEventsCte(fyStart, fyEnd, filters)}),
    programme_events AS (
      SELECT ep.programme_scheme_id, e.* FROM eligible_events e
      JOIN event_programmes ep ON ep.event_id = e.id
      WHERE ${inClause('ep.programme_scheme_id', filters.programmeIds)}
    )
    SELECT p.id AS programme_scheme_id, p.title_en AS programme_name_en,
      (SELECT array_agg(c.name_en ORDER BY c.name_en) FROM programme_commodities pc
        JOIN commodities c ON c.id = pc.commodity_id WHERE pc.programme_scheme_id = p.id) AS target_commodities_en,
      count(*)::int AS completed_events,
      count(DISTINCT pe.district_id)::int AS districts_reached,
      sum(pe.final_participant_count)::int AS recorded_participants,
      count(*) FILTER (WHERE pe.final_participant_count IS NULL)::int AS missing_attendance,
      count(*) FILTER (WHERE pe.district_id IS NULL)::int AS missing_district
    FROM programme_schemes p
    JOIN programme_events pe ON pe.programme_scheme_id = p.id
    GROUP BY p.id
    ORDER BY p.title_en
  `);
  return rows.map((r) => ({
    programmeSchemeId: r.programme_scheme_id,
    programmeNameEn: r.programme_name_en,
    targetCommoditiesEn: r.target_commodities_en ?? [],
    completedEvents: Number(r.completed_events),
    districtsReached: Number(r.districts_reached),
    recordedParticipants: r.recorded_participants === null ? null : Number(r.recorded_participants),
    missingAttendance: Number(r.missing_attendance),
    missingDistrict: Number(r.missing_district),
  }));
}

async function programmeDistrictDrilldown(
  fyStart: Date,
  fyEnd: Date,
  filters: ProgrammeReportFilters,
): Promise<ProgrammeDistrictDrilldownRow[]> {
  const rows = await prisma.$queryRaw<
    {
      programme_scheme_id: string;
      district_id: string | null;
      district_name_en: string | null;
      blocks_reached: bigint;
      completed_events: bigint;
      recorded_participants: number | null;
      missing_attendance: bigint;
      missing_block: bigint;
    }[]
  >(Prisma.sql`
    WITH eligible_events AS (${eligibleEventsCte(fyStart, fyEnd, filters)}),
    programme_events AS (
      SELECT ep.programme_scheme_id, e.* FROM eligible_events e
      JOIN event_programmes ep ON ep.event_id = e.id
      WHERE ${inClause('ep.programme_scheme_id', filters.programmeIds)}
    )
    SELECT pe.programme_scheme_id, d.id AS district_id, d.name_en AS district_name_en,
      count(DISTINCT pe.block_id)::int AS blocks_reached,
      count(*)::int AS completed_events,
      sum(pe.final_participant_count)::int AS recorded_participants,
      count(*) FILTER (WHERE pe.final_participant_count IS NULL)::int AS missing_attendance,
      count(*) FILTER (WHERE pe.block_id IS NULL)::int AS missing_block
    FROM programme_events pe LEFT JOIN districts d ON d.id = pe.district_id
    GROUP BY pe.programme_scheme_id, d.id
    ORDER BY pe.programme_scheme_id, d.name_en NULLS LAST
  `);
  return rows.map((r) => ({
    programmeSchemeId: r.programme_scheme_id,
    districtId: r.district_id,
    districtNameEn: r.district_name_en,
    blocksReached: Number(r.blocks_reached),
    completedEvents: Number(r.completed_events),
    recordedParticipants: r.recorded_participants === null ? null : Number(r.recorded_participants),
    missingAttendance: Number(r.missing_attendance),
    missingBlock: Number(r.missing_block),
  }));
}

/** Toolkit items whose toolkit belongs directly to `programmeSchemeId`, with evidence/distributed counts. */
export interface ToolkitItemGroupCountRow extends ToolkitItemCountRow {
  groupKey: string; // programmeSchemeId | districtId | commodityId, depending on caller
  groupDistrictId?: string | null; // present for programme+district grouped queries
}

async function programmeToolkitItems(
  fyStart: Date,
  fyEnd: Date,
  filters: ProgrammeReportFilters,
): Promise<ToolkitItemGroupCountRow[]> {
  const rows = await prisma.$queryRaw<
    {
      programme_scheme_id: string;
      toolkit_item_id: string;
      toolkit_id: string;
      item_name_en: string;
      item_name_hi: string | null;
      distribution_pattern: string;
      default_group_size: number | null;
      default_quantity_per_unit: string | null;
      unit: string | null;
      evidence_count: bigint;
      distributed_count: bigint;
    }[]
  >(Prisma.sql`
    WITH eligible_events AS (${eligibleEventsCte(fyStart, fyEnd, filters)}),
    programme_events AS (
      SELECT ep.programme_scheme_id, e.* FROM eligible_events e
      JOIN event_programmes ep ON ep.event_id = e.id
      WHERE ${inClause('ep.programme_scheme_id', filters.programmeIds)}
    )
    SELECT t.programme_scheme_id, i.id AS toolkit_item_id, i.toolkit_id,
      i.name_en AS item_name_en, i.name_hi AS item_name_hi,
      i.distribution_basis::text AS distribution_pattern,
      i.default_group_size, i.default_quantity_per_unit, i.unit,
      count(DISTINCT s.id)::int AS evidence_count,
      count(DISTINCT s.id) FILTER (WHERE s.distribution_done AND di.total_quantity > 0)::int AS distributed_count
    FROM toolkits t
    JOIN toolkit_items i ON i.toolkit_id = t.id
    JOIN programme_events pe ON pe.programme_scheme_id = t.programme_scheme_id
    LEFT JOIN toolkit_distribution_summaries s ON s.toolkit_id = t.id AND s.event_id = pe.id
    LEFT JOIN toolkit_distribution_items di ON di.toolkit_distribution_summary_id = s.id AND di.toolkit_item_id = i.id
    WHERE t.programme_scheme_id IS NOT NULL
    GROUP BY t.programme_scheme_id, i.id
    ORDER BY t.programme_scheme_id, i.name_en
  `);
  return rows.map((r) => ({
    groupKey: r.programme_scheme_id,
    toolkitItemId: r.toolkit_item_id,
    toolkitId: r.toolkit_id,
    itemNameEn: r.item_name_en,
    itemNameHi: r.item_name_hi,
    distributionPattern: r.distribution_pattern,
    defaultGroupSize: r.default_group_size,
    defaultQuantityPerUnit: r.default_quantity_per_unit,
    unit: r.unit,
    evidenceCount: Number(r.evidence_count),
    distributedCount: Number(r.distributed_count),
  }));
}

/** Programme IDs that have at least one toolkit — used to distinguish "N/A" from an empty item list. */
async function programmeIdsWithToolkit(programmeIds: string[]): Promise<Set<string>> {
  const rows = await prisma.toolkit.findMany({
    where: {
      programmeSchemeId: programmeIds.length > 0 ? { in: programmeIds } : { not: null },
    },
    select: { programmeSchemeId: true },
    distinct: ['programmeSchemeId'],
  });
  return new Set(rows.map((r) => r.programmeSchemeId).filter((id): id is string => id !== null));
}

async function programmeToolkitItemsByDistrict(
  fyStart: Date,
  fyEnd: Date,
  filters: ProgrammeReportFilters,
): Promise<ToolkitItemGroupCountRow[]> {
  const rows = await prisma.$queryRaw<
    {
      programme_scheme_id: string;
      district_id: string | null;
      toolkit_item_id: string;
      toolkit_id: string;
      item_name_en: string;
      item_name_hi: string | null;
      distribution_pattern: string;
      default_group_size: number | null;
      default_quantity_per_unit: string | null;
      unit: string | null;
      evidence_count: bigint;
      distributed_count: bigint;
    }[]
  >(Prisma.sql`
    WITH eligible_events AS (${eligibleEventsCte(fyStart, fyEnd, filters)}),
    programme_events AS (
      SELECT ep.programme_scheme_id, e.* FROM eligible_events e
      JOIN event_programmes ep ON ep.event_id = e.id
      WHERE ${inClause('ep.programme_scheme_id', filters.programmeIds)}
    )
    SELECT t.programme_scheme_id, pe.district_id, i.id AS toolkit_item_id, i.toolkit_id,
      i.name_en AS item_name_en, i.name_hi AS item_name_hi,
      i.distribution_basis::text AS distribution_pattern,
      i.default_group_size, i.default_quantity_per_unit, i.unit,
      count(DISTINCT s.id)::int AS evidence_count,
      count(DISTINCT s.id) FILTER (WHERE s.distribution_done AND di.total_quantity > 0)::int AS distributed_count
    FROM toolkits t
    JOIN toolkit_items i ON i.toolkit_id = t.id
    JOIN programme_events pe ON pe.programme_scheme_id = t.programme_scheme_id
    LEFT JOIN toolkit_distribution_summaries s ON s.toolkit_id = t.id AND s.event_id = pe.id
    LEFT JOIN toolkit_distribution_items di ON di.toolkit_distribution_summary_id = s.id AND di.toolkit_item_id = i.id
    WHERE t.programme_scheme_id IS NOT NULL
    GROUP BY t.programme_scheme_id, pe.district_id, i.id
    ORDER BY t.programme_scheme_id, pe.district_id NULLS LAST, i.name_en
  `);
  return rows.map((r) => ({
    groupKey: r.programme_scheme_id,
    groupDistrictId: r.district_id,
    toolkitItemId: r.toolkit_item_id,
    toolkitId: r.toolkit_id,
    itemNameEn: r.item_name_en,
    itemNameHi: r.item_name_hi,
    distributionPattern: r.distribution_pattern,
    defaultGroupSize: r.default_group_size,
    defaultQuantityPerUnit: r.default_quantity_per_unit,
    unit: r.unit,
    evidenceCount: Number(r.evidence_count),
    distributedCount: Number(r.distributed_count),
  }));
}

// ── District Activity Coverage ────────────────────────────────────────────────────────────────
export interface DistrictReportFilters extends EventScopeFilters {
  programmeIds: string[];
  includeUnassignedProgramme: boolean;
}

function districtProgrammeMembershipClause(filters: DistrictReportFilters): Prisma.Sql {
  if (filters.programmeIds.length === 0 && !filters.includeUnassignedProgramme) return Prisma.sql`TRUE`;
  const parts: Prisma.Sql[] = [];
  if (filters.programmeIds.length > 0) {
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM event_programmes ep WHERE ep.event_id = e.id AND ep.programme_scheme_id IN (${Prisma.join(filters.programmeIds)}))`,
    );
  }
  if (filters.includeUnassignedProgramme) {
    parts.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM event_programmes ep WHERE ep.event_id = e.id)`);
  }
  return Prisma.sql`(${Prisma.join(parts, ' OR ')})`;
}

export interface DistrictSummaryRow {
  districtId: string | null;
  districtNameEn: string | null;
  completedEvents: number;
  blocksReached: number;
  programmesCovered: number;
  recordedParticipants: number | null;
  missingAttendance: number;
  missingBlock: number;
}

async function districtReportSummary(
  fyStart: Date,
  fyEnd: Date,
  filters: DistrictReportFilters,
): Promise<DistrictSummaryRow[]> {
  const rows = await prisma.$queryRaw<
    {
      district_id: string | null;
      district_name_en: string | null;
      completed_events: bigint;
      blocks_reached: bigint;
      programmes_covered: bigint;
      recorded_participants: number | null;
      missing_attendance: bigint;
      missing_block: bigint;
    }[]
  >(Prisma.sql`
    WITH scoped_events AS (
      SELECT e.* FROM (${eligibleEventsCte(fyStart, fyEnd, filters)}) e
      WHERE ${districtProgrammeMembershipClause(filters)}
    )
    SELECT e.district_id, d.name_en AS district_name_en,
      count(*)::int AS completed_events,
      count(DISTINCT e.block_id)::int AS blocks_reached,
      count(DISTINCT ep.programme_scheme_id)::int AS programmes_covered,
      sum(e.final_participant_count)::int AS recorded_participants,
      count(*) FILTER (WHERE e.final_participant_count IS NULL)::int AS missing_attendance,
      count(*) FILTER (WHERE e.block_id IS NULL)::int AS missing_block
    FROM scoped_events e
    LEFT JOIN districts d ON d.id = e.district_id
    LEFT JOIN event_programmes ep ON ep.event_id = e.id
    GROUP BY e.district_id, d.name_en
    ORDER BY d.name_en NULLS LAST
  `);
  return rows.map((r) => ({
    districtId: r.district_id,
    districtNameEn: r.district_name_en,
    completedEvents: Number(r.completed_events),
    blocksReached: Number(r.blocks_reached),
    programmesCovered: Number(r.programmes_covered),
    recordedParticipants: r.recorded_participants === null ? null : Number(r.recorded_participants),
    missingAttendance: Number(r.missing_attendance),
    missingBlock: Number(r.missing_block),
  }));
}

export interface DistrictProgrammeBreakdownRow {
  districtId: string | null;
  programmeSchemeId: string | null;
  programmeNameEn: string | null;
  completedEvents: number;
  blocksReached: number;
  recordedParticipants: number | null;
  missingAttendance: number;
}

async function districtProgrammeBreakdown(
  fyStart: Date,
  fyEnd: Date,
  filters: DistrictReportFilters,
): Promise<DistrictProgrammeBreakdownRow[]> {
  const rows = await prisma.$queryRaw<
    {
      district_id: string | null;
      programme_scheme_id: string | null;
      programme_name_en: string | null;
      completed_events: bigint;
      blocks_reached: bigint;
      recorded_participants: number | null;
      missing_attendance: bigint;
    }[]
  >(Prisma.sql`
    WITH scoped_events AS (
      SELECT e.* FROM (${eligibleEventsCte(fyStart, fyEnd, filters)}) e
      WHERE ${districtProgrammeMembershipClause(filters)}
    )
    SELECT e.district_id, p.id AS programme_scheme_id, p.title_en AS programme_name_en,
      count(*)::int AS completed_events,
      count(DISTINCT e.block_id)::int AS blocks_reached,
      sum(e.final_participant_count)::int AS recorded_participants,
      count(*) FILTER (WHERE e.final_participant_count IS NULL)::int AS missing_attendance
    FROM scoped_events e
    LEFT JOIN event_programmes ep ON ep.event_id = e.id
    LEFT JOIN programme_schemes p ON p.id = ep.programme_scheme_id
    GROUP BY e.district_id, p.id
    ORDER BY e.district_id NULLS LAST, p.title_en NULLS LAST
  `);
  return rows.map((r) => ({
    districtId: r.district_id,
    programmeSchemeId: r.programme_scheme_id,
    programmeNameEn: r.programme_name_en,
    completedEvents: Number(r.completed_events),
    blocksReached: Number(r.blocks_reached),
    recordedParticipants: r.recorded_participants === null ? null : Number(r.recorded_participants),
    missingAttendance: Number(r.missing_attendance),
  }));
}

export interface DistrictBlockBreakdownRow {
  districtId: string | null;
  blockId: string | null;
  blockNameEn: string | null;
  completedEvents: number;
  recordedParticipants: number | null;
  missingAttendance: number;
}

async function districtBlockBreakdown(
  fyStart: Date,
  fyEnd: Date,
  filters: DistrictReportFilters,
): Promise<DistrictBlockBreakdownRow[]> {
  const rows = await prisma.$queryRaw<
    {
      district_id: string | null;
      block_id: string | null;
      block_name_en: string | null;
      completed_events: bigint;
      recorded_participants: number | null;
      missing_attendance: bigint;
    }[]
  >(Prisma.sql`
    WITH scoped_events AS (
      SELECT e.* FROM (${eligibleEventsCte(fyStart, fyEnd, filters)}) e
      WHERE ${districtProgrammeMembershipClause(filters)}
    )
    SELECT e.district_id, b.id AS block_id, b.name_en AS block_name_en,
      count(*)::int AS completed_events,
      sum(e.final_participant_count)::int AS recorded_participants,
      count(*) FILTER (WHERE e.final_participant_count IS NULL)::int AS missing_attendance
    FROM scoped_events e LEFT JOIN blocks b ON b.id = e.block_id
    GROUP BY e.district_id, b.id, b.name_en
    ORDER BY e.district_id NULLS LAST, b.name_en NULLS LAST
  `);
  return rows.map((r) => ({
    districtId: r.district_id,
    blockId: r.block_id,
    blockNameEn: r.block_name_en,
    completedEvents: Number(r.completed_events),
    recordedParticipants: r.recorded_participants === null ? null : Number(r.recorded_participants),
    missingAttendance: Number(r.missing_attendance),
  }));
}

export interface DistrictEventTypeBreakdownRow {
  districtId: string | null;
  eventTypeId: string;
  eventTypeNameEn: string;
  completedEvents: number;
  recordedParticipants: number | null;
  missingAttendance: number;
}

async function districtEventTypeBreakdown(
  fyStart: Date,
  fyEnd: Date,
  filters: DistrictReportFilters,
): Promise<DistrictEventTypeBreakdownRow[]> {
  const rows = await prisma.$queryRaw<
    {
      district_id: string | null;
      event_type_id: string;
      event_type_name_en: string;
      completed_events: bigint;
      recorded_participants: number | null;
      missing_attendance: bigint;
    }[]
  >(Prisma.sql`
    WITH scoped_events AS (
      SELECT e.* FROM (${eligibleEventsCte(fyStart, fyEnd, filters)}) e
      WHERE ${districtProgrammeMembershipClause(filters)}
    )
    SELECT e.district_id, t.id AS event_type_id, t.name_en AS event_type_name_en,
      count(*)::int AS completed_events,
      sum(e.final_participant_count)::int AS recorded_participants,
      count(*) FILTER (WHERE e.final_participant_count IS NULL)::int AS missing_attendance
    FROM scoped_events e JOIN event_types t ON t.id = e.event_type_id
    GROUP BY e.district_id, t.id
    ORDER BY e.district_id NULLS LAST, t.name_en
  `);
  return rows.map((r) => ({
    districtId: r.district_id,
    eventTypeId: r.event_type_id,
    eventTypeNameEn: r.event_type_name_en,
    completedEvents: Number(r.completed_events),
    recordedParticipants: r.recorded_participants === null ? null : Number(r.recorded_participants),
    missingAttendance: Number(r.missing_attendance),
  }));
}

/** Toolkits related to a district's scoped events: via the event's programme, or via direct distribution evidence. */
async function districtToolkitItems(
  fyStart: Date,
  fyEnd: Date,
  filters: DistrictReportFilters,
): Promise<ToolkitItemGroupCountRow[]> {
  const rows = await prisma.$queryRaw<
    {
      district_id: string | null;
      toolkit_item_id: string;
      toolkit_id: string;
      item_name_en: string;
      item_name_hi: string | null;
      distribution_pattern: string;
      default_group_size: number | null;
      default_quantity_per_unit: string | null;
      unit: string | null;
      evidence_count: bigint;
      distributed_count: bigint;
    }[]
  >(Prisma.sql`
    WITH scoped_events AS (
      SELECT e.* FROM (${eligibleEventsCte(fyStart, fyEnd, filters)}) e
      WHERE ${districtProgrammeMembershipClause(filters)}
    ),
    relevant AS (
      SELECT DISTINCT e.district_id, t.id AS toolkit_id, e.id AS event_id
      FROM scoped_events e
      JOIN toolkits t ON (
        EXISTS (SELECT 1 FROM event_programmes ep WHERE ep.event_id = e.id AND ep.programme_scheme_id = t.programme_scheme_id)
        OR EXISTS (SELECT 1 FROM toolkit_distribution_summaries ds WHERE ds.event_id = e.id AND ds.toolkit_id = t.id)
      )
    )
    SELECT r.district_id, i.id AS toolkit_item_id, i.toolkit_id,
      i.name_en AS item_name_en, i.name_hi AS item_name_hi,
      i.distribution_basis::text AS distribution_pattern,
      i.default_group_size, i.default_quantity_per_unit, i.unit,
      count(DISTINCT s.id)::int AS evidence_count,
      count(DISTINCT s.id) FILTER (WHERE s.distribution_done AND di.total_quantity > 0)::int AS distributed_count
    FROM relevant r
    JOIN toolkit_items i ON i.toolkit_id = r.toolkit_id
    LEFT JOIN toolkit_distribution_summaries s ON s.toolkit_id = r.toolkit_id AND s.event_id = r.event_id
    LEFT JOIN toolkit_distribution_items di ON di.toolkit_distribution_summary_id = s.id AND di.toolkit_item_id = i.id
    GROUP BY r.district_id, i.id
    ORDER BY r.district_id NULLS LAST, i.name_en
  `);
  return rows.map((r) => ({
    groupKey: r.district_id ?? '',
    toolkitItemId: r.toolkit_item_id,
    toolkitId: r.toolkit_id,
    itemNameEn: r.item_name_en,
    itemNameHi: r.item_name_hi,
    distributionPattern: r.distribution_pattern,
    defaultGroupSize: r.default_group_size,
    defaultQuantityPerUnit: r.default_quantity_per_unit,
    unit: r.unit,
    evidenceCount: Number(r.evidence_count),
    distributedCount: Number(r.distributed_count),
  }));
}

// ── Commodity-wise Report ─────────────────────────────────────────────────────────────────────
export interface CommodityReportFilters extends EventScopeFilters {
  commodityIds: string[];
}

/** UNION of direct event–commodity links and links through programme commodities, deduplicated by (commodity, event). */
function commodityAttributionCte(fyStart: Date, fyEnd: Date, filters: CommodityReportFilters): Prisma.Sql {
  return Prisma.sql`
    eligible AS (${eligibleEventsCte(fyStart, fyEnd, filters)}),
    direct_links AS (
      SELECT ec.commodity_id, e.id AS event_id FROM eligible e JOIN event_commodities ec ON ec.event_id = e.id
    ),
    programme_links AS (
      SELECT DISTINCT pc.commodity_id, e.id AS event_id FROM eligible e
      JOIN event_programmes ep ON ep.event_id = e.id
      JOIN programme_commodities pc ON pc.programme_scheme_id = ep.programme_scheme_id
    ),
    attribution AS (
      SELECT commodity_id, event_id FROM direct_links
      UNION
      SELECT commodity_id, event_id FROM programme_links
    ),
    commodity_events AS (
      SELECT a.commodity_id, e.* FROM attribution a JOIN eligible e ON e.id = a.event_id
      WHERE ${inClause('a.commodity_id', filters.commodityIds)}
    )
  `;
}

export interface CommoditySummaryRow {
  commodityId: string;
  commodityNameEn: string;
  completedEvents: number;
  districtsReached: number;
  recordedParticipants: number | null;
  missingAttendance: number;
}

async function commodityReportSummary(
  fyStart: Date,
  fyEnd: Date,
  filters: CommodityReportFilters,
): Promise<CommoditySummaryRow[]> {
  const rows = await prisma.$queryRaw<
    {
      commodity_id: string;
      commodity_name_en: string;
      completed_events: bigint;
      districts_reached: bigint;
      recorded_participants: number | null;
      missing_attendance: bigint;
    }[]
  >(Prisma.sql`
    WITH ${commodityAttributionCte(fyStart, fyEnd, filters)}
    SELECT c.id AS commodity_id, c.name_en AS commodity_name_en,
      count(*)::int AS completed_events,
      count(DISTINCT ce.district_id)::int AS districts_reached,
      sum(ce.final_participant_count)::int AS recorded_participants,
      count(*) FILTER (WHERE ce.final_participant_count IS NULL)::int AS missing_attendance
    FROM commodities c
    JOIN commodity_events ce ON ce.commodity_id = c.id
    GROUP BY c.id
    ORDER BY c.name_en
  `);
  return rows.map((r) => ({
    commodityId: r.commodity_id,
    commodityNameEn: r.commodity_name_en,
    completedEvents: Number(r.completed_events),
    districtsReached: Number(r.districts_reached),
    recordedParticipants: r.recorded_participants === null ? null : Number(r.recorded_participants),
    missingAttendance: Number(r.missing_attendance),
  }));
}

export interface CommodityDistrictBreakdownRow {
  commodityId: string;
  districtId: string | null;
  districtNameEn: string | null;
  completedEvents: number;
  blocksReached: number;
  recordedParticipants: number | null;
  missingAttendance: number;
}

async function commodityDistrictBreakdown(
  fyStart: Date,
  fyEnd: Date,
  filters: CommodityReportFilters,
): Promise<CommodityDistrictBreakdownRow[]> {
  const rows = await prisma.$queryRaw<
    {
      commodity_id: string;
      district_id: string | null;
      district_name_en: string | null;
      completed_events: bigint;
      blocks_reached: bigint;
      recorded_participants: number | null;
      missing_attendance: bigint;
    }[]
  >(Prisma.sql`
    WITH ${commodityAttributionCte(fyStart, fyEnd, filters)}
    SELECT ce.commodity_id, d.id AS district_id, d.name_en AS district_name_en,
      count(*)::int AS completed_events,
      count(DISTINCT ce.block_id)::int AS blocks_reached,
      sum(ce.final_participant_count)::int AS recorded_participants,
      count(*) FILTER (WHERE ce.final_participant_count IS NULL)::int AS missing_attendance
    FROM commodity_events ce LEFT JOIN districts d ON d.id = ce.district_id
    GROUP BY ce.commodity_id, d.id
    ORDER BY ce.commodity_id, d.name_en NULLS LAST
  `);
  return rows.map((r) => ({
    commodityId: r.commodity_id,
    districtId: r.district_id,
    districtNameEn: r.district_name_en,
    completedEvents: Number(r.completed_events),
    blocksReached: Number(r.blocks_reached),
    recordedParticipants: r.recorded_participants === null ? null : Number(r.recorded_participants),
    missingAttendance: Number(r.missing_attendance),
  }));
}

export interface CommodityBlockBreakdownRow {
  commodityId: string;
  districtId: string | null;
  districtNameEn: string | null;
  blockId: string | null;
  blockNameEn: string | null;
  completedEvents: number;
  recordedParticipants: number | null;
  missingAttendance: number;
}

async function commodityBlockBreakdown(
  fyStart: Date,
  fyEnd: Date,
  filters: CommodityReportFilters,
): Promise<CommodityBlockBreakdownRow[]> {
  const rows = await prisma.$queryRaw<
    {
      commodity_id: string;
      district_id: string | null;
      district_name_en: string | null;
      block_id: string | null;
      block_name_en: string | null;
      completed_events: bigint;
      recorded_participants: number | null;
      missing_attendance: bigint;
    }[]
  >(Prisma.sql`
    WITH ${commodityAttributionCte(fyStart, fyEnd, filters)}
    SELECT ce.commodity_id, d.id AS district_id, d.name_en AS district_name_en,
      b.id AS block_id, b.name_en AS block_name_en,
      count(*)::int AS completed_events,
      sum(ce.final_participant_count)::int AS recorded_participants,
      count(*) FILTER (WHERE ce.final_participant_count IS NULL)::int AS missing_attendance
    FROM commodity_events ce
    LEFT JOIN districts d ON d.id = ce.district_id
    LEFT JOIN blocks b ON b.id = ce.block_id
    GROUP BY ce.commodity_id, d.id, d.name_en, b.id, b.name_en
    ORDER BY ce.commodity_id, d.name_en NULLS LAST, b.name_en NULLS LAST
  `);
  return rows.map((r) => ({
    commodityId: r.commodity_id,
    districtId: r.district_id,
    districtNameEn: r.district_name_en,
    blockId: r.block_id,
    blockNameEn: r.block_name_en,
    completedEvents: Number(r.completed_events),
    recordedParticipants: r.recorded_participants === null ? null : Number(r.recorded_participants),
    missingAttendance: Number(r.missing_attendance),
  }));
}

export interface CommodityEventTypeBreakdownRow {
  commodityId: string;
  eventTypeId: string;
  eventTypeNameEn: string;
  completedEvents: number;
  recordedParticipants: number | null;
  missingAttendance: number;
}

async function commodityEventTypeBreakdown(
  fyStart: Date,
  fyEnd: Date,
  filters: CommodityReportFilters,
): Promise<CommodityEventTypeBreakdownRow[]> {
  const rows = await prisma.$queryRaw<
    {
      commodity_id: string;
      event_type_id: string;
      event_type_name_en: string;
      completed_events: bigint;
      recorded_participants: number | null;
      missing_attendance: bigint;
    }[]
  >(Prisma.sql`
    WITH ${commodityAttributionCte(fyStart, fyEnd, filters)}
    SELECT ce.commodity_id, t.id AS event_type_id, t.name_en AS event_type_name_en,
      count(*)::int AS completed_events,
      sum(ce.final_participant_count)::int AS recorded_participants,
      count(*) FILTER (WHERE ce.final_participant_count IS NULL)::int AS missing_attendance
    FROM commodity_events ce JOIN event_types t ON t.id = ce.event_type_id
    GROUP BY ce.commodity_id, t.id
    ORDER BY ce.commodity_id, t.name_en
  `);
  return rows.map((r) => ({
    commodityId: r.commodity_id,
    eventTypeId: r.event_type_id,
    eventTypeNameEn: r.event_type_name_en,
    completedEvents: Number(r.completed_events),
    recordedParticipants: r.recorded_participants === null ? null : Number(r.recorded_participants),
    missingAttendance: Number(r.missing_attendance),
  }));
}

/** Toolkits directly linked to the commodity (Toolkit.commodityId) — never via programme association, to avoid pulling in unrelated toolkits. */
async function commodityToolkitItems(
  fyStart: Date,
  fyEnd: Date,
  filters: CommodityReportFilters,
): Promise<ToolkitItemGroupCountRow[]> {
  const rows = await prisma.$queryRaw<
    {
      commodity_id: string;
      toolkit_item_id: string;
      toolkit_id: string;
      item_name_en: string;
      item_name_hi: string | null;
      distribution_pattern: string;
      default_group_size: number | null;
      default_quantity_per_unit: string | null;
      unit: string | null;
      evidence_count: bigint;
      distributed_count: bigint;
    }[]
  >(Prisma.sql`
    WITH ${commodityAttributionCte(fyStart, fyEnd, filters)}
    SELECT t.commodity_id, i.id AS toolkit_item_id, i.toolkit_id,
      i.name_en AS item_name_en, i.name_hi AS item_name_hi,
      i.distribution_basis::text AS distribution_pattern,
      i.default_group_size, i.default_quantity_per_unit, i.unit,
      count(DISTINCT s.id)::int AS evidence_count,
      count(DISTINCT s.id) FILTER (WHERE s.distribution_done AND di.total_quantity > 0)::int AS distributed_count
    FROM toolkits t
    JOIN toolkit_items i ON i.toolkit_id = t.id
    JOIN commodity_events ce ON ce.commodity_id = t.commodity_id
    LEFT JOIN toolkit_distribution_summaries s ON s.toolkit_id = t.id AND s.event_id = ce.id
    LEFT JOIN toolkit_distribution_items di ON di.toolkit_distribution_summary_id = s.id AND di.toolkit_item_id = i.id
    WHERE t.commodity_id IS NOT NULL
    GROUP BY t.commodity_id, i.id
    ORDER BY t.commodity_id, i.name_en
  `);
  return rows.map((r) => ({
    groupKey: r.commodity_id,
    toolkitItemId: r.toolkit_item_id,
    toolkitId: r.toolkit_id,
    itemNameEn: r.item_name_en,
    itemNameHi: r.item_name_hi,
    distributionPattern: r.distribution_pattern,
    defaultGroupSize: r.default_group_size,
    defaultQuantityPerUnit: r.default_quantity_per_unit,
    unit: r.unit,
    evidenceCount: Number(r.evidence_count),
    distributedCount: Number(r.distributed_count),
  }));
}

async function commodityIdsWithToolkit(commodityIds: string[]): Promise<Set<string>> {
  const rows = await prisma.toolkit.findMany({
    where: { commodityId: commodityIds.length > 0 ? { in: commodityIds } : { not: null } },
    select: { commodityId: true },
    distinct: ['commodityId'],
  });
  return new Set(rows.map((r) => r.commodityId).filter((id): id is string => id !== null));
}

export const reportsRepository = {
  listFinancialYears,
  findCurrentFinancialYears,
  findFinancialYearById,
  listProgrammeOptions,
  listDistrictOptions,
  listBlockOptions,
  listEventTypeOptions,
  listCommodityOptions,
  programmeReportSummary,
  programmeDistrictDrilldown,
  programmeToolkitItems,
  programmeToolkitItemsByDistrict,
  programmeIdsWithToolkit,
  districtReportSummary,
  districtProgrammeBreakdown,
  districtBlockBreakdown,
  districtEventTypeBreakdown,
  districtToolkitItems,
  commodityReportSummary,
  commodityDistrictBreakdown,
  commodityBlockBreakdown,
  commodityEventTypeBreakdown,
  commodityToolkitItems,
  commodityIdsWithToolkit,
};

export type ReportsRepository = typeof reportsRepository;
