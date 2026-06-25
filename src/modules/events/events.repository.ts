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
import type { EventFilters, EventOrderingField } from './events.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

/** Full detail include — masters + cover + every relationship junction resolved. */
const eventInclude = {
  eventType: true,
  trainingType: true,
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
 * `publicVisibilityWhere()` predicate at the database level, so a linked Document, Gallery, or
 * News item that is unpublished, hidden, archived, or future-scheduled is never exposed through
 * the parent event — directly or via its media URLs. Documents carry the extra `is_public` flag.
 * The payload type is identical to `EventRow` (nested `where` does not change the row shape).
 */
const publicEventInclude = {
  eventType: true,
  trainingType: true,
  district: true,
  block: true,
  coverMedia: true,
  commodities: { include: { commodity: true } },
  programmes: { include: { programmeScheme: true } },
  institutions: { include: { institution: true } },
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
  eventType: true,
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

export interface EventQueryOptions {
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
  if (f.eventType) where.eventType = isUuid(f.eventType) ? { id: f.eventType } : { slug: f.eventType };
  if (f.district) where.district = isUuid(f.district) ? { id: f.district } : { slug: f.district };
  if (f.block) where.block = isUuid(f.block) ? { id: f.block } : { slug: f.block };
  if (f.commodity) {
    const sel = isUuid(f.commodity) ? { id: f.commodity } : { slug: f.commodity };
    where.commodities = { some: { commodity: sel } };
  }
  if (f.programme) {
    const sel = isUuid(f.programme) ? { id: f.programme } : { slug: f.programme };
    where.programmes = { some: { programmeScheme: sel } };
  }
  if (f.institution) {
    const sel = isUuid(f.institution) ? { id: f.institution } : { slug: f.institution };
    where.institutions = { some: { institution: sel } };
  }

  const dateRange: Prisma.DateTimeFilter = {};
  if (f.dateFrom) dateRange.gte = f.dateFrom;
  if (f.dateTo) dateRange.lte = f.dateTo;
  if (f.year) {
    dateRange.gte = new Date(Date.UTC(f.year, 0, 1));
    dateRange.lte = new Date(Date.UTC(f.year, 11, 31, 23, 59, 59, 999));
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

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.event.count({ where: { slug } })) > 0;
}

export async function create(data: Prisma.EventUncheckedCreateInput, db: Db = prisma): Promise<EventRow> {
  return db.event.create({ data, include: eventInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<EventRow | null> {
  return db.event.findUnique({ where: { id }, include: eventInclude });
}

export async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<EventRow | null> {
  if (!opts.public) return prisma.event.findUnique({ where: { slug }, include: eventInclude });
  // Public detail: the event itself must satisfy the predicate AND its linked documents /
  // galleries / news are filtered by the same predicate (publicEventInclude).
  return prisma.event.findFirst({ where: { ...buildWhere({}, { public: true }), slug }, include: publicEventInclude });
}

export async function update(id: string, data: Prisma.EventUncheckedUpdateInput, db: Db = prisma): Promise<EventRow> {
  return db.event.update({ where: { id }, data, include: eventInclude });
}

export async function list(
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

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

// ── Junction writers (called inside the service's transaction) ─────────────────
export async function setCommodities(eventId: string, ids: string[], db: Db): Promise<void> {
  await db.eventCommodity.deleteMany({ where: { eventId } });
  if (ids.length) await db.eventCommodity.createMany({ data: ids.map((commodityId) => ({ eventId, commodityId })) });
}
export async function setProgrammes(eventId: string, ids: string[], db: Db): Promise<void> {
  await db.eventProgramme.deleteMany({ where: { eventId } });
  if (ids.length) await db.eventProgramme.createMany({ data: ids.map((programmeSchemeId) => ({ eventId, programmeSchemeId })) });
}
export async function setInstitutions(eventId: string, ids: string[], db: Db): Promise<void> {
  await db.eventInstitution.deleteMany({ where: { eventId } });
  if (ids.length) await db.eventInstitution.createMany({ data: ids.map((institutionId) => ({ eventId, institutionId })) });
}
export async function setDocuments(eventId: string, ids: string[], db: Db): Promise<void> {
  await db.eventDocument.deleteMany({ where: { eventId } });
  if (ids.length) await db.eventDocument.createMany({ data: ids.map((documentId) => ({ eventId, documentId })) });
}
export async function setGalleries(eventId: string, ids: string[], db: Db): Promise<void> {
  await db.eventGallery.deleteMany({ where: { eventId } });
  if (ids.length) await db.eventGallery.createMany({ data: ids.map((galleryId) => ({ eventId, galleryId })) });
}

// ── Reference / activation validation ──────────────────────────────────────────
export interface EventRefs {
  eventTypeId?: string;
  trainingTypeId?: string | null;
  districtId?: string | null;
  blockId?: string | null;
  commodityIds?: string[];
  programmeIds?: string[];
  institutionIds?: string[];
  documentIds?: string[];
  galleryIds?: string[];
}

export async function validateReferences(refs: EventRefs): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};

  if (refs.eventTypeId !== undefined) {
    const row = await prisma.eventType.findUnique({ where: { id: refs.eventTypeId }, select: { isActive: true } });
    if (!row) errors.event_type_id = ['Event type not found.'];
    else if (!row.isActive) errors.event_type_id = ['Event type is inactive.'];
  }
  if (refs.trainingTypeId) {
    const row = await prisma.trainingType.findUnique({ where: { id: refs.trainingTypeId }, select: { isActive: true } });
    if (!row) errors.training_type_id = ['Training type not found.'];
    else if (!row.isActive) errors.training_type_id = ['Training type is inactive.'];
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

/**
 * Validate `trainingTypeId` against the permitted set of the chosen programmes (API spec §6):
 * when any linked programme declares `permitted_training_type_ids`, the event's training type must
 * be in the union of those permitted sets. Programmes with no declared permitted set don't
 * constrain. Returns a field error map ({} when valid / not applicable).
 */
export async function validateTrainingTypeAgainstProgrammes(
  trainingTypeId: string | null | undefined,
  programmeIds: string[] | undefined,
): Promise<Record<string, string[]>> {
  if (!trainingTypeId || !programmeIds || programmeIds.length === 0) return {};
  const permitted = await prisma.programmePermittedTrainingType.findMany({
    where: { programmeSchemeId: { in: programmeIds } },
    select: { programmeSchemeId: true, trainingTypeId: true },
  });
  if (permitted.length === 0) return {}; // no programme constrains training type
  const allowed = new Set(permitted.map((p) => p.trainingTypeId));
  if (!allowed.has(trainingTypeId)) {
    return { training_type_id: ['Training type is not permitted by the selected programme(s).'] };
  }
  return {};
}

// ── Active field definitions (dynamic-field engine) ────────────────────────────
export async function activeFieldDefinitions(eventTypeId: string): Promise<
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
  validateTrainingTypeAgainstProgrammes,
  activeFieldDefinitions,
};
