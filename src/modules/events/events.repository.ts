/**
 * Event repository — the ONLY Prisma caller for the events module (coding-standards §6).
 * Encapsulates the visibility predicate, ordering allow-list, the five relationship junction
 * writers (commodities / programmes / institutions / documents / galleries), reference/activation
 * validation (including block↔district consistency and programme-permitted-training-type), and the
 * active field-definition lookups the dynamic-field engine needs. Returns entities, never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import { referenceFilter } from '@/shared/reference-filter';
import type { EventFilters, EventOrderingField } from './events.types';

type Db = PrismaClient | Prisma.TransactionClient;


/** Full detail include — masters + cover + every relationship junction resolved. */
const eventInclude = {
  eventType: { include: { eventCategory: true } },
  district: true,
  block: true,
  coverMedia: true,
  commodities: { include: { commodity: true } },
  programmes: { include: { programmeScheme: true } },
  institutions: { include: { institution: true } },
  documents: { include: { document: { include: { documentType: true, fileAsset: true } } } },
  galleries: { include: { gallery: { include: { coverMedia: true, _count: { select: { images: true } } } } } },
  news: true,
} satisfies Prisma.EventInclude;

export type EventRow = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

/**
 * Public detail include (remediation — Issue 1, visibility propagation). Same shape as
 * `eventInclude`, but every LINKED public-content collection is filtered by the SINGLE shared
 * `publicVisibilityWhere()` predicate at the database level, so a linked Programme, Institution,
 * Document, Gallery, or News item that is unpublished, hidden, archived, or future-scheduled is
 * never exposed through the parent event — directly or via its media URLs. Programmes and
 * Institutions are gated here (Phase 8 remediation Issue 2) with the same predicate their own
 * public APIs use. Documents carry the extra `is_public` flag. The payload type is identical to
 * `EventRow` (nested `where` does not change the row shape).
 */
const publicEventInclude = {
  eventType: { include: { eventCategory: true } },
  district: true,
  block: true,
  coverMedia: true,
  commodities: { include: { commodity: true } },
  programmes: {
    where: { programmeScheme: publicVisibilityWhere() as Prisma.ProgrammeSchemeWhereInput },
    include: { programmeScheme: true },
  },
  institutions: {
    where: { institution: publicVisibilityWhere() as Prisma.InstitutionWhereInput },
    include: { institution: true },
  },
  documents: {
    where: { document: publicVisibilityWhere({ requireIsPublic: true }) as Prisma.DocumentWhereInput },
    include: { document: { include: { documentType: true, fileAsset: true } } },
  },
  galleries: {
    where: { gallery: publicVisibilityWhere() as Prisma.GalleryWhereInput },
    include: { gallery: { include: { coverMedia: true, _count: { select: { images: true } } } } },
  },
  news: { where: publicVisibilityWhere() as Prisma.EventNewsWhereInput },
} satisfies Prisma.EventInclude;

/** Lightweight list summary — masters + cover only (no relationship collections, no dynamic). */
const eventSummaryInclude = {
  eventType: { include: { eventCategory: true } },
  district: true,
  coverMedia: true,
} satisfies Prisma.EventInclude;

export type EventSummaryRow = Prisma.EventGetPayload<{ include: typeof eventSummaryInclude }>;

const ORDER_COLUMN: Record<EventOrderingField, keyof Prisma.EventOrderByWithRelationInput> = {
  start_date: 'startDate',
  published_at: 'publishedAt',
  display_order: 'displayOrder',
  created_at: 'createdAt',
};

interface EventQueryOptions {
  public?: boolean;
  ordering: { field: EventOrderingField; direction: 'asc' | 'desc' };
}

export function buildWhere(f: EventFilters, opts: { public?: boolean }): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {};
  const and: Prisma.EventWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.EventWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.eventStatus) where.eventStatus = f.eventStatus;
  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.eventType || f.eventCategory) {
    where.eventType = {
      ...(f.eventType ? referenceFilter(f.eventType) : {}),
      ...(f.eventCategory ? { eventCategory: referenceFilter(f.eventCategory) } : {}),
    };
  }
  if (f.district) where.district = referenceFilter(f.district);
  if (f.block) where.block = referenceFilter(f.block);
  if (f.commodity) {
    const sel = referenceFilter(f.commodity);
    where.commodities = { some: { commodity: sel } };
  }
  if (f.programme) {
    const sel = referenceFilter(f.programme);
    where.programmes = { some: { programmeScheme: sel } };
  }
  if (f.institution) {
    const sel = referenceFilter(f.institution);
    where.institutions = { some: { institution: sel } };
  }

  const dateRange: Prisma.DateTimeFilter = {};
  if (f.dateFrom) dateRange.gte = f.dateFrom;
  if (f.dateTo) dateRange.lte = f.dateTo;
  if (f.year) {
    const yearStart = new Date(Date.UTC(f.year, 0, 1));
    const yearEnd = new Date(Date.UTC(f.year, 11, 31, 23, 59, 59, 999));
    dateRange.gte = f.dateFrom && f.dateFrom > yearStart ? f.dateFrom : yearStart;
    dateRange.lte = f.dateTo && f.dateTo < yearEnd ? f.dateTo : yearEnd;
  }
  if (Object.keys(dateRange).length > 0) where.startDate = dateRange;

  if (f.search) {
    const q = f.search;
    and.push({
      OR: [
        { titleEn: { contains: q, mode: 'insensitive' } },
        { titleHi: { contains: q, mode: 'insensitive' } },
        { summaryEn: { contains: q, mode: 'insensitive' } },
        { descriptionEn: { contains: q, mode: 'insensitive' } },
        { locationText: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.event.count({ where: { slug } })) > 0;
}

async function create(data: Prisma.EventUncheckedCreateInput, db: Db = prisma): Promise<EventRow> {
  return db.event.create({ data, include: eventInclude });
}

async function findById(id: string, db: Db = prisma): Promise<EventRow | null> {
  return db.event.findUnique({ where: { id }, include: eventInclude });
}

async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<EventRow | null> {
  if (!opts.public) return prisma.event.findUnique({ where: { slug }, include: eventInclude });
  // Public detail: the event itself must satisfy the predicate AND its linked documents /
  // galleries / news are filtered by the same predicate (publicEventInclude).
  return prisma.event.findFirst({ where: { ...buildWhere({}, { public: true }), slug }, include: publicEventInclude });
}

async function update(id: string, data: Prisma.EventUncheckedUpdateInput, db: Db = prisma): Promise<EventRow> {
  return db.event.update({ where: { id }, data, include: eventInclude });
}

async function list(
  f: EventFilters,
  skip: number,
  take: number,
  opts: EventQueryOptions,
): Promise<{ rows: EventSummaryRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.EventOrderByWithRelationInput = { [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction };
  const [rows, total] = await Promise.all([
    prisma.event.findMany({ where, include: eventSummaryInclude, orderBy, skip, take }),
    prisma.event.count({ where }),
  ]);
  return { rows, total };
}

function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

// ── Junction writers (called inside the service's transaction) ─────────────────
async function setCommodities(eventId: string, ids: string[], db: Db): Promise<void> {
  await db.eventCommodity.deleteMany({ where: { eventId } });
  if (ids.length) await db.eventCommodity.createMany({ data: ids.map((commodityId) => ({ eventId, commodityId })) });
}
async function setProgrammes(eventId: string, ids: string[], db: Db): Promise<void> {
  await db.eventProgramme.deleteMany({ where: { eventId } });
  if (ids.length) await db.eventProgramme.createMany({ data: ids.map((programmeSchemeId) => ({ eventId, programmeSchemeId })) });
}
async function setInstitutions(eventId: string, ids: string[], db: Db): Promise<void> {
  await db.eventInstitution.deleteMany({ where: { eventId } });
  if (ids.length) await db.eventInstitution.createMany({ data: ids.map((institutionId) => ({ eventId, institutionId })) });
}
async function setDocuments(eventId: string, ids: string[], db: Db): Promise<void> {
  await db.eventDocument.deleteMany({ where: { eventId } });
  if (ids.length) await db.eventDocument.createMany({ data: ids.map((documentId) => ({ eventId, documentId })) });
}
async function setGalleries(eventId: string, ids: string[], db: Db): Promise<void> {
  await db.eventGallery.deleteMany({ where: { eventId } });
  if (ids.length) await db.eventGallery.createMany({ data: ids.map((galleryId) => ({ eventId, galleryId })) });
}

// ── Reference / activation validation ──────────────────────────────────────────
interface EventRefs {
  eventTypeId?: string;
  districtId?: string | null;
  blockId?: string | null;
  commodityIds?: string[];
  programmeIds?: string[];
  institutionIds?: string[];
  documentIds?: string[];
  galleryIds?: string[];
}

async function validateReferences(refs: EventRefs): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};

  if (refs.eventTypeId !== undefined) {
    const row = await prisma.eventType.findUnique({
      where: { id: refs.eventTypeId },
      select: { isActive: true, eventCategory: { select: { isActive: true } } },
    });
    if (!row) errors.event_type_id = ['Event type not found.'];
    else if (!row.isActive) errors.event_type_id = ['Event type is inactive.'];
    else if (!row.eventCategory.isActive) errors.event_type_id = ['Event type’s category is inactive.'];
  }
  if (refs.districtId) {
    const row = await prisma.district.findUnique({ where: { id: refs.districtId }, select: { isActive: true } });
    if (!row) errors.district_id = ['District not found.'];
    else if (!row.isActive) errors.district_id = ['District is inactive.'];
  }
  // block must exist, be active, AND belong to the chosen district (when both are set).
  if (refs.blockId) {
    const row = await prisma.block.findUnique({ where: { id: refs.blockId }, select: { isActive: true, districtId: true } });
    if (!row) errors.block_id = ['Block not found.'];
    else if (!row.isActive) errors.block_id = ['Block is inactive.'];
    else if (refs.districtId && row.districtId !== refs.districtId) {
      errors.block_id = ['Block does not belong to the selected district.'];
    }
  }

  await assertActiveSet('commodity_ids', refs.commodityIds, (ids) =>
    prisma.commodity.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } }), errors);
  // Programmes / institutions / documents / galleries are content records (no isActive); the FK
  // guarantees referential integrity, but we still verify existence to return a clean 422 instead
  // of a raw FK error, and to message the exact missing ids.
  await assertExistsSet('programme_ids', refs.programmeIds, (ids) =>
    prisma.programmeScheme.findMany({ where: { id: { in: ids } }, select: { id: true } }), errors);
  await assertExistsSet('institution_ids', refs.institutionIds, (ids) =>
    prisma.institution.findMany({ where: { id: { in: ids } }, select: { id: true } }), errors);
  await assertExistsSet('document_ids', refs.documentIds, (ids) =>
    prisma.document.findMany({ where: { id: { in: ids } }, select: { id: true } }), errors);
  await assertExistsSet('gallery_ids', refs.galleryIds, (ids) =>
    prisma.gallery.findMany({ where: { id: { in: ids } }, select: { id: true } }), errors);

  return errors;
}

async function assertActiveSet(
  field: string,
  ids: string[] | undefined,
  query: (ids: string[]) => Promise<Array<{ id: string }>>,
  errors: Record<string, string[]>,
): Promise<void> {
  if (!ids || ids.length === 0) return;
  const unique = [...new Set(ids)];
  const found = new Set((await query(unique)).map((r) => r.id));
  const missing = unique.filter((id) => !found.has(id));
  if (missing.length > 0) errors[field] = missing.map((id) => `Reference ${id} not found or inactive.`);
}

async function assertExistsSet(
  field: string,
  ids: string[] | undefined,
  query: (ids: string[]) => Promise<Array<{ id: string }>>,
  errors: Record<string, string[]>,
): Promise<void> {
  if (!ids || ids.length === 0) return;
  const unique = [...new Set(ids)];
  const found = new Set((await query(unique)).map((r) => r.id));
  const missing = unique.filter((id) => !found.has(id));
  if (missing.length > 0) errors[field] = missing.map((id) => `Reference ${id} not found.`);
}


// ── Active field definitions (dynamic-field engine) ────────────────────────────
async function activeFieldDefinitions(eventTypeId: string): Promise<
  Array<{ fieldKey: string; labelEn: string; dataType: import('@prisma/client').FieldDataType; isRequired: boolean; options: string[] | null }>
> {
  const rows = await prisma.eventFieldDefinition.findMany({
    where: { eventTypeId, isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: { fieldKey: true, labelEn: true, dataType: true, isRequired: true, options: true },
  });
  return rows.map((r) => ({
    fieldKey: r.fieldKey,
    labelEn: r.labelEn,
    dataType: r.dataType,
    isRequired: r.isRequired,
    options: Array.isArray(r.options) ? (r.options as unknown[]).map(String) : null,
  }));
}

// ── Scheduled event-status recompute (Phase 14 lifecycle automation) ────────────
/** A lightweight candidate row for the date-derived status recompute job. */
interface StatusCandidate {
  id: string;
  startDate: Date;
  endDate: Date | null;
  eventStatus: import('@prisma/client').EventStatus;
}

/**
 * Candidates whose date-derived `event_status` may still advance over time: automatic-status events
 * (`status_override = false`) that are not explicitly completed (`completed_date IS NULL`) and are
 * still in a non-terminal derived state (`scheduled` or `ongoing`). Postponed/cancelled
 * (override=true) and already-completed events are excluded — they never auto-transition. Bounded
 * by `take`; oldest start first for stable batching.
 */
async function findStatusRecomputeCandidates(take: number): Promise<StatusCandidate[]> {
  return prisma.event.findMany({
    where: { statusOverride: false, completedDate: null, eventStatus: { in: ['scheduled', 'ongoing'] } },
    select: { id: true, startDate: true, endDate: true, eventStatus: true },
    orderBy: { startDate: 'asc' },
    take,
  });
}

/** Minimal status write (no relationship includes) used by the recompute job. */
async function updateEventStatus(
  id: string,
  eventStatus: import('@prisma/client').EventStatus,
  userId: string,
  db: Db = prisma,
): Promise<void> {
  await db.event.update({ where: { id }, data: { eventStatus, updatedById: userId }, select: { id: true } });
}

export const eventRepository = {
  slugExists,
  create,
  findById,
  findBySlug,
  update,
  list,
  transaction,
  setCommodities,
  setProgrammes,
  setInstitutions,
  setDocuments,
  setGalleries,
  validateReferences,
  activeFieldDefinitions,
  findStatusRecomputeCandidates,
  updateEventStatus,
};
