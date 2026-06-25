/**
 * Procurement Update repository — the ONLY Prisma caller for this module (coding-standards §6).
 * Encapsulates the public-visibility predicate so public vs admin queries differ only by it; applies
 * the ordering allow-list; validates master activation + linked-document existence + block/district
 * consistency. Returns entities, never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { ProcurementUpdateFilters, ProcurementUpdateOrderingField } from './procurement-updates.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

/** Detail/summary include — type + commodity/district/block/programme masters + linked document
 *  (with its type + file asset so the shared `toDocumentRef` mapper can build a compact reference). */
const procurementInclude = {
  procurementUpdateType: true,
  commodity: true,
  district: true,
  block: true,
  programmeScheme: true,
  document: { include: { documentType: true, fileAsset: true } },
} satisfies Prisma.ProcurementUpdateInclude;

export type ProcurementUpdateRow = Prisma.ProcurementUpdateGetPayload<{ include: typeof procurementInclude }>;

const ORDER_COLUMN: Record<ProcurementUpdateOrderingField, keyof Prisma.ProcurementUpdateOrderByWithRelationInput> = {
  effective_date: 'effectiveDate',
  published_at: 'publishedAt',
  display_order: 'displayOrder',
  created_at: 'createdAt',
};

export interface ProcurementUpdateQueryOptions {
  public?: boolean;
  ordering: { field: ProcurementUpdateOrderingField; direction: 'asc' | 'desc' };
}

const idOrSlug = (v: string): { id: string } | { slug: string } => (isUuid(v) ? { id: v } : { slug: v });

/** Build the Prisma `where` from validated filters. Exported for unit testing (pure, DB-free). */
export function buildWhere(
  f: ProcurementUpdateFilters,
  opts: { public?: boolean },
): Prisma.ProcurementUpdateWhereInput {
  const where: Prisma.ProcurementUpdateWhereInput = {};
  const and: Prisma.ProcurementUpdateWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.ProcurementUpdateWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.procurementUpdateType) where.procurementUpdateType = idOrSlug(f.procurementUpdateType);
  if (f.commodity) where.commodity = idOrSlug(f.commodity);
  if (f.district) where.district = idOrSlug(f.district);
  if (f.block) where.block = idOrSlug(f.block);
  if (f.programme) where.programmeScheme = idOrSlug(f.programme);

  // Date filtering on effective_date: explicit range and/or year.
  const dateRange: Prisma.DateTimeNullableFilter = {};
  if (f.dateFrom) dateRange.gte = f.dateFrom;
  if (f.dateTo) dateRange.lte = f.dateTo;
  if (f.year) {
    dateRange.gte = new Date(Date.UTC(f.year, 0, 1));
    dateRange.lte = new Date(Date.UTC(f.year, 11, 31, 23, 59, 59, 999));
  }
  if (Object.keys(dateRange).length > 0) where.effectiveDate = dateRange;

  if (f.search) {
    const q = f.search;
    and.push({
      OR: [
        { titleEn: { contains: q, mode: 'insensitive' } },
        { titleHi: { contains: q, mode: 'insensitive' } },
        { summaryEn: { contains: q, mode: 'insensitive' } },
        { summaryHi: { contains: q, mode: 'insensitive' } },
        { locationText: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.procurementUpdate.count({ where: { slug } })) > 0;
}

export async function create(
  data: Prisma.ProcurementUpdateUncheckedCreateInput,
  db: Db = prisma,
): Promise<ProcurementUpdateRow> {
  return db.procurementUpdate.create({ data, include: procurementInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<ProcurementUpdateRow | null> {
  return db.procurementUpdate.findUnique({ where: { id }, include: procurementInclude });
}

export async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<ProcurementUpdateRow | null> {
  if (!opts.public) return prisma.procurementUpdate.findUnique({ where: { slug }, include: procurementInclude });
  return prisma.procurementUpdate.findFirst({
    where: { ...buildWhere({}, { public: true }), slug },
    include: procurementInclude,
  });
}

export async function update(
  id: string,
  data: Prisma.ProcurementUpdateUncheckedUpdateInput,
  db: Db = prisma,
): Promise<ProcurementUpdateRow> {
  return db.procurementUpdate.update({ where: { id }, data, include: procurementInclude });
}

export async function list(
  f: ProcurementUpdateFilters,
  skip: number,
  take: number,
  opts: ProcurementUpdateQueryOptions,
): Promise<{ rows: ProcurementUpdateRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.ProcurementUpdateOrderByWithRelationInput = {
    [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction,
  };
  const [rows, total] = await Promise.all([
    prisma.procurementUpdate.findMany({ where, include: procurementInclude, orderBy, skip, take }),
    prisma.procurementUpdate.count({ where }),
  ]);
  return { rows, total };
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

/**
 * Validate referenced masters/content. The update type must exist + be active; commodity/district
 * must be active when set; a block must be active AND belong to the chosen district (when both set);
 * the programme + document must exist when set. Returns field-keyed errors ({} when all valid).
 */
export interface ProcurementUpdateRefs {
  procurementUpdateTypeId?: string;
  commodityId?: string | null;
  districtId?: string | null;
  blockId?: string | null;
  programmeSchemeId?: string | null;
  documentId?: string | null;
}

export async function validateReferences(refs: ProcurementUpdateRefs): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};

  if (refs.procurementUpdateTypeId !== undefined) {
    const row = await prisma.procurementUpdateType.findUnique({
      where: { id: refs.procurementUpdateTypeId },
      select: { isActive: true },
    });
    if (!row) errors.procurement_update_type_id = ['Procurement update type not found.'];
    else if (!row.isActive) errors.procurement_update_type_id = ['Procurement update type is inactive.'];
  }
  if (refs.commodityId) {
    const row = await prisma.commodity.findUnique({ where: { id: refs.commodityId }, select: { isActive: true } });
    if (!row) errors.commodity_id = ['Commodity not found.'];
    else if (!row.isActive) errors.commodity_id = ['Commodity is inactive.'];
  }
  if (refs.districtId) {
    const row = await prisma.district.findUnique({ where: { id: refs.districtId }, select: { isActive: true } });
    if (!row) errors.district_id = ['District not found.'];
    else if (!row.isActive) errors.district_id = ['District is inactive.'];
  }
  // block must exist, be active, AND belong to the chosen district (when both are set).
  if (refs.blockId) {
    const row = await prisma.block.findUnique({
      where: { id: refs.blockId },
      select: { isActive: true, districtId: true },
    });
    if (!row) errors.block_id = ['Block not found.'];
    else if (!row.isActive) errors.block_id = ['Block is inactive.'];
    else if (refs.districtId && row.districtId !== refs.districtId) {
      errors.block_id = ['Block does not belong to the selected district.'];
    }
  }
  if (refs.programmeSchemeId) {
    const row = await prisma.programmeScheme.findUnique({ where: { id: refs.programmeSchemeId }, select: { id: true } });
    if (!row) errors.programme_scheme_id = ['Programme/scheme not found.'];
  }
  if (refs.documentId) {
    const row = await prisma.document.findUnique({ where: { id: refs.documentId }, select: { id: true } });
    if (!row) errors.document_id = ['Document not found.'];
  }
  return errors;
}

export const procurementUpdateRepository = {
  slugExists,
  create,
  findById,
  findBySlug,
  update,
  list,
  transaction,
  validateReferences,
};
