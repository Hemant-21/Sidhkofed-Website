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
import { referenceFilter } from '@/shared/reference-filter';
import type { DocumentFilters, DocumentOrderingField } from './documents.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

/**
 * Full detail include — every junction reference + masters resolved.
 *
 * Classification (Publications vs Notifications, and the knowledge category / communication
 * type) is entirely derived from `documentType`'s own parent relation, never from the
 * deprecated `Document.knowledgeCategoryId`/`showInKnowledgeCentre` columns — those columns
 * are retained on the table only for migration compatibility and are not read here.
 */
const documentInclude = {
  documentType: { include: { knowledgeCategory: true, communicationType: true } },
  fileAsset: true,
  financialYear: true,
  commodities: { include: { commodity: true } },
  districts: { include: { district: true } },
} satisfies Prisma.DocumentInclude;

export type DocumentRow = Prisma.DocumentGetPayload<{ include: typeof documentInclude }>;

/** Lightweight list summary — masters + file asset, NOT the relation collections. */
const documentSummaryInclude = {
  documentType: { include: { knowledgeCategory: true, communicationType: true } },
  fileAsset: true,
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

interface DocumentQueryOptions {
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

  if (f.language) where.language = f.language;

  // Classification (section/category/communication-type/type) is always resolved through the
  // `documentType` relation — never the deprecated `Document.knowledgeCategoryId`/
  // `showInKnowledgeCentre` columns. All predicates below AND together (never OR/broaden):
  // an absent category means "all eligible documents in the section"; an absent type means
  // "all eligible documents in the selected category".
  const documentTypeWhere: Prisma.DocumentTypeWhereInput = {};
  if (f.documentType) Object.assign(documentTypeWhere, referenceFilter(f.documentType));
  if (f.knowledgeCategory) documentTypeWhere.knowledgeCategory = referenceFilter(f.knowledgeCategory);
  if (f.communicationType) documentTypeWhere.communicationType = referenceFilter(f.communicationType);
  // `knowledgeCentre` is the legacy `?knowledge_centre=true` flag — kept for backwards
  // compatibility, equivalent to `documentSection: 'publications'`.
  const section = f.documentSection ?? (f.knowledgeCentre ? 'publications' : undefined);
  if (section === 'publications' && !f.knowledgeCategory) {
    documentTypeWhere.knowledgeCategoryId = { not: null };
  } else if (section === 'notifications' && !f.communicationType) {
    documentTypeWhere.communicationTypeId = { not: null };
  }
  if (Object.keys(documentTypeWhere).length > 0) where.documentType = documentTypeWhere;

  if (f.financialYear) {
    where.financialYear = isUuid(f.financialYear) ? { id: f.financialYear } : { label: f.financialYear };
  }
  if (f.commodity) {
    const sel = referenceFilter(f.commodity);
    where.commodities = { some: { commodity: sel } };
  }
  if (f.district) {
    const sel = referenceFilter(f.district);
    where.districts = { some: { district: sel } };
  }

  // Date filtering: explicit range and/or publication year.
  const dateRange: Prisma.DateTimeNullableFilter = {};
  if (f.dateFrom) dateRange.gte = f.dateFrom;
  if (f.dateTo) dateRange.lte = f.dateTo;
  if (f.year) {
    const yearStart = new Date(Date.UTC(f.year, 0, 1));
    const yearEnd = new Date(Date.UTC(f.year, 11, 31, 23, 59, 59, 999));
    dateRange.gte = f.dateFrom && f.dateFrom > yearStart ? f.dateFrom : yearStart;
    dateRange.lte = f.dateTo && f.dateTo < yearEnd ? f.dateTo : yearEnd;
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

async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.document.count({ where: { slug } })) > 0;
}

async function create(data: Prisma.DocumentUncheckedCreateInput, db: Db = prisma): Promise<DocumentRow> {
  return db.document.create({ data, include: documentInclude });
}

async function findById(id: string, db: Db = prisma): Promise<DocumentRow | null> {
  return db.document.findUnique({ where: { id }, include: documentInclude });
}

async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<DocumentRow | null> {
  if (!opts.public) return prisma.document.findUnique({ where: { slug }, include: documentInclude });
  // Public slug lookup still applies the visibility predicate (never expose unpublished).
  return prisma.document.findFirst({ where: { ...buildWhere({}, { public: true }), slug }, include: documentInclude });
}

async function update(id: string, data: Prisma.DocumentUncheckedUpdateInput, db: Db = prisma): Promise<DocumentRow> {
  return db.document.update({ where: { id }, data, include: documentInclude });
}

async function list(
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
function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

// ── Junction writers (called inside the service's transaction) ─────────────────
async function setCommodities(documentId: string, commodityIds: string[], db: Db): Promise<void> {
  await db.documentCommodity.deleteMany({ where: { documentId } });
  if (commodityIds.length > 0) {
    await db.documentCommodity.createMany({ data: commodityIds.map((commodityId) => ({ documentId, commodityId })) });
  }
}
async function setDistricts(documentId: string, districtIds: string[], db: Db): Promise<void> {
  await db.documentDistrict.deleteMany({ where: { documentId } });
  if (districtIds.length > 0) {
    await db.documentDistrict.createMany({ data: districtIds.map((districtId) => ({ documentId, districtId })) });
  }
}
/**
 * Validate that every referenced master exists AND is active (coding-standards §5 — reject
 * inactive-master references on create/update). FK Restrict already guarantees existence; this
 * adds the active-status gate the FK cannot. Returns field-keyed errors ({} when all valid).
 */
interface ReferenceRefs {
  documentTypeId?: string;
  financialYearId?: string | null;
  commodityIds?: string[];
  districtIds?: string[];
}

async function validateReferences(refs: ReferenceRefs): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};

  if (refs.documentTypeId !== undefined) {
    const row = await prisma.documentType.findUnique({
      where: { id: refs.documentTypeId },
      select: { isActive: true, knowledgeCategory: { select: { isActive: true } }, communicationType: { select: { isActive: true } } },
    });
    if (!row) errors.document_type_id = ['Document type not found.'];
    else if (!row.isActive) errors.document_type_id = ['Document type is inactive.'];
    else if (row.knowledgeCategory && !row.knowledgeCategory.isActive) {
      errors.document_type_id = ["This document type's knowledge category is inactive."];
    } else if (row.communicationType && !row.communicationType.isActive) {
      errors.document_type_id = ["This document type's communication type is inactive."];
    }
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

/**
 * The classification a Document derives from its Document Type: which parent family
 * (knowledge category / communication type) it belongs to, i.e. its Publications/Notifications
 * section. Returns null when the type itself doesn't exist (caller should have already
 * validated it via `validateReferences`).
 */
interface DocumentTypeClassification {
  knowledgeCategoryId: string | null;
  communicationTypeId: string | null;
}

async function getDocumentTypeClassification(documentTypeId: string): Promise<DocumentTypeClassification | null> {
  const row = await prisma.documentType.findUnique({
    where: { id: documentTypeId },
    select: { knowledgeCategoryId: true, communicationTypeId: true },
  });
  return row ? { knowledgeCategoryId: row.knowledgeCategoryId, communicationTypeId: row.communicationTypeId } : null;
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
  validateReferences,
  getDocumentTypeClassification,
};
