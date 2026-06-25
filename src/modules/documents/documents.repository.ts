/**
 * Document repository — the ONLY Prisma caller for the documents module (coding-standards §6).
 *
 * Supports (TASK 17): pagination, filtering (type / knowledge category / commodity / district /
 * financial year / language / knowledge-centre flag), date filtering (year + from/to range),
 * sorting (allow-listed ordering), and a keyword metadata search seam that is FTS-ready
 * (today an indexed ILIKE over title/description; swappable for the parked `search_vector`
 * GIN column without changing the service contract). Returns entities, never DTOs.
 *
 * The public visibility predicate (published + public_visibility + is_public + not archived +
 * publish_start_at due) is encapsulated here so public vs admin queries differ only by it.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { DocumentFilters, DocumentOrderingField } from './documents.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

/** Full detail include — every junction reference + masters resolved. */
const documentInclude = {
  documentType: true,
  fileAsset: true,
  knowledgeCategory: true,
  financialYear: true,
  commodities: { include: { commodity: true } },
  districts: { include: { district: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.DocumentInclude;

export type DocumentRow = Prisma.DocumentGetPayload<{ include: typeof documentInclude }>;

/** Lightweight list summary — masters + file asset, NOT the relation collections. */
const documentSummaryInclude = {
  documentType: true,
  fileAsset: true,
  knowledgeCategory: true,
  financialYear: true,
} satisfies Prisma.DocumentInclude;

export type DocumentSummaryRow = Prisma.DocumentGetPayload<{ include: typeof documentSummaryInclude }>;

const ORDER_COLUMN: Record<DocumentOrderingField, keyof Prisma.DocumentOrderByWithRelationInput> = {
  publication_date: 'publicationDate',
  published_at: 'publishedAt',
  title_en: 'titleEn',
  display_order: 'displayOrder',
  created_at: 'createdAt',
};

export interface DocumentQueryOptions {
  /** Apply the public visibility predicate. */
  public?: boolean;
  ordering: { field: DocumentOrderingField; direction: 'asc' | 'desc' };
}

/** Build the Prisma `where` from validated filters. Public predicate applied when requested.
 *  Exported for unit testing (pure, DB-free). */
export function buildWhere(f: DocumentFilters, opts: { public?: boolean }): Prisma.DocumentWhereInput {
  const where: Prisma.DocumentWhereInput = {};
  const and: Prisma.DocumentWhereInput[] = [];

  if (opts.public) {
    // Single shared public predicate (published + public_visibility + is_public + not archived +
    // publish_start_at due). Pushed as an AND element so it never collides with the keyword
    // search `OR` added below.
    and.push(publicVisibilityWhere({ requireIsPublic: true }) as Prisma.DocumentWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.knowledgeCentre) where.showInKnowledgeCentre = true;
  if (f.language) where.language = f.language;

  if (f.documentType) {
    where.documentType = isUuid(f.documentType) ? { id: f.documentType } : { slug: f.documentType };
  }
  if (f.knowledgeCategory) {
    where.knowledgeCategory = isUuid(f.knowledgeCategory) ? { id: f.knowledgeCategory } : { slug: f.knowledgeCategory };
  }
  if (f.financialYear) {
    where.financialYear = isUuid(f.financialYear) ? { id: f.financialYear } : { label: f.financialYear };
  }
  if (f.commodity) {
    const sel = isUuid(f.commodity) ? { id: f.commodity } : { slug: f.commodity };
    where.commodities = { some: { commodity: sel } };
  }
  if (f.district) {
    const sel = isUuid(f.district) ? { id: f.district } : { slug: f.district };
    where.districts = { some: { district: sel } };
  }

  // Date filtering: explicit range and/or publication year.
  const dateRange: Prisma.DateTimeNullableFilter = {};
  if (f.dateFrom) dateRange.gte = f.dateFrom;
  if (f.dateTo) dateRange.lte = f.dateTo;
  if (f.year) {
    dateRange.gte = new Date(Date.UTC(f.year, 0, 1));
    dateRange.lte = new Date(Date.UTC(f.year, 11, 31, 23, 59, 59, 999));
  }
  if (Object.keys(dateRange).length > 0) where.publicationDate = dateRange;

  // Keyword metadata search (FTS-ready seam) — bilingual title/description ILIKE.
  if (f.search) {
    const q = f.search;
    and.push({
      OR: [
        { titleEn: { contains: q, mode: 'insensitive' } },
        { titleHi: { contains: q, mode: 'insensitive' } },
        { descriptionEn: { contains: q, mode: 'insensitive' } },
        { descriptionHi: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.document.count({ where: { slug } })) > 0;
}

export async function create(data: Prisma.DocumentUncheckedCreateInput, db: Db = prisma): Promise<DocumentRow> {
  return db.document.create({ data, include: documentInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<DocumentRow | null> {
  return db.document.findUnique({ where: { id }, include: documentInclude });
}

export async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<DocumentRow | null> {
  if (!opts.public) return prisma.document.findUnique({ where: { slug }, include: documentInclude });
  // Public slug lookup still applies the visibility predicate (never expose unpublished).
  return prisma.document.findFirst({ where: { ...buildWhere({}, { public: true }), slug }, include: documentInclude });
}

export async function update(id: string, data: Prisma.DocumentUncheckedUpdateInput, db: Db = prisma): Promise<DocumentRow> {
  return db.document.update({ where: { id }, data, include: documentInclude });
}

export async function list(
  f: DocumentFilters,
  skip: number,
  take: number,
  opts: DocumentQueryOptions,
): Promise<{ rows: DocumentSummaryRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.DocumentOrderByWithRelationInput = { [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction };
  const [rows, total] = await Promise.all([
    prisma.document.findMany({ where, include: documentSummaryInclude, orderBy, skip, take }),
    prisma.document.count({ where }),
  ]);
  return { rows, total };
}

/** Run a function inside a transaction (service orchestrates junction + media-usage writes). */
export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

// ── Junction writers (called inside the service's transaction) ─────────────────
export async function setCommodities(documentId: string, commodityIds: string[], db: Db): Promise<void> {
  await db.documentCommodity.deleteMany({ where: { documentId } });
  if (commodityIds.length > 0) {
    await db.documentCommodity.createMany({ data: commodityIds.map((commodityId) => ({ documentId, commodityId })) });
  }
}
export async function setDistricts(documentId: string, districtIds: string[], db: Db): Promise<void> {
  await db.documentDistrict.deleteMany({ where: { documentId } });
  if (districtIds.length > 0) {
    await db.documentDistrict.createMany({ data: districtIds.map((districtId) => ({ documentId, districtId })) });
  }
}
export async function setTags(documentId: string, tagIds: string[], db: Db): Promise<void> {
  await db.documentTag.deleteMany({ where: { documentId } });
  if (tagIds.length > 0) {
    await db.documentTag.createMany({ data: tagIds.map((tagId) => ({ documentId, tagId })) });
  }
}

/**
 * Validate that every referenced master exists AND is active (coding-standards §5 — reject
 * inactive-master references on create/update). FK Restrict already guarantees existence; this
 * adds the active-status gate the FK cannot. Returns field-keyed errors ({} when all valid).
 */
export interface ReferenceRefs {
  documentTypeId?: string;
  knowledgeCategoryId?: string | null;
  financialYearId?: string | null;
  commodityIds?: string[];
  districtIds?: string[];
  tagIds?: string[];
}

export async function validateReferences(refs: ReferenceRefs): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};

  if (refs.documentTypeId !== undefined) {
    const row = await prisma.documentType.findUnique({ where: { id: refs.documentTypeId }, select: { isActive: true } });
    if (!row) errors.document_type_id = ['Document type not found.'];
    else if (!row.isActive) errors.document_type_id = ['Document type is inactive.'];
  }
  if (refs.knowledgeCategoryId) {
    const row = await prisma.knowledgeCategory.findUnique({ where: { id: refs.knowledgeCategoryId }, select: { isActive: true } });
    if (!row) errors.knowledge_category_id = ['Knowledge category not found.'];
    else if (!row.isActive) errors.knowledge_category_id = ['Knowledge category is inactive.'];
  }
  if (refs.financialYearId) {
    const row = await prisma.financialYear.findUnique({ where: { id: refs.financialYearId }, select: { isActive: true } });
    if (!row) errors.financial_year_id = ['Financial year not found.'];
    else if (!row.isActive) errors.financial_year_id = ['Financial year is inactive.'];
  }

  await assertActiveSet('commodity_ids', refs.commodityIds, (ids) =>
    prisma.commodity.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } }), errors);
  await assertActiveSet('district_ids', refs.districtIds, (ids) =>
    prisma.district.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } }), errors);
  await assertActiveSet('tag_ids', refs.tagIds, (ids) =>
    prisma.tag.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } }), errors);

  return errors;
}

/** Check that every id in `ids` resolves to an ACTIVE master row; records per-index errors. */
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
  if (missing.length > 0) {
    errors[field] = missing.map((id) => `Reference ${id} not found or inactive.`);
  }
}

export const documentRepository = {
  slugExists,
  create,
  findById,
  findBySlug,
  update,
  list,
  transaction,
  setCommodities,
  setDistricts,
  setTags,
  validateReferences,
};
