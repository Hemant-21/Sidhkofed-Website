/**
 * Tender repository — the ONLY Prisma caller for this module (coding-standards §6). Encapsulates the
 * public-visibility predicate so public vs admin queries differ only by it; applies the ordering
 * allow-list; validates master activation. Returns entities, never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { TenderFilters, TenderOrderingField } from './tenders.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

/** Detail/summary include — tender type only (tenders carry no own junction collections). */
const tenderInclude = { tenderType: true } satisfies Prisma.TenderInclude;

export type TenderRow = Prisma.TenderGetPayload<{ include: typeof tenderInclude }>;

const ORDER_COLUMN: Record<TenderOrderingField, keyof Prisma.TenderOrderByWithRelationInput> = {
  submission_deadline: 'submissionDeadline',
  publish_date: 'publishDate',
  published_at: 'publishedAt',
  display_order: 'displayOrder',
  created_at: 'createdAt',
};

export interface TenderQueryOptions {
  public?: boolean;
  ordering: { field: TenderOrderingField; direction: 'asc' | 'desc' };
}

/** Build the Prisma `where` from validated filters. Exported for unit testing (pure, DB-free). */
export function buildWhere(f: TenderFilters, opts: { public?: boolean }): Prisma.TenderWhereInput {
  const where: Prisma.TenderWhereInput = {};
  const and: Prisma.TenderWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.TenderWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.tenderStatus) where.tenderStatus = f.tenderStatus;
  if (f.tenderType) {
    where.tenderType = isUuid(f.tenderType) ? { id: f.tenderType } : { slug: f.tenderType };
  }
  if (f.year) {
    where.publishDate = {
      gte: new Date(Date.UTC(f.year, 0, 1)),
      lte: new Date(Date.UTC(f.year, 11, 31, 23, 59, 59, 999)),
    };
  }
  if (f.search) {
    const q = f.search;
    and.push({
      OR: [
        { titleEn: { contains: q, mode: 'insensitive' } },
        { titleHi: { contains: q, mode: 'insensitive' } },
        { summaryEn: { contains: q, mode: 'insensitive' } },
        { summaryHi: { contains: q, mode: 'insensitive' } },
        { tenderNumber: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.tender.count({ where: { slug } })) > 0;
}

/**
 * True when another tender already uses `tenderNumber` (exact, case-sensitive — official reference
 * codes). `excludeId` skips the record being updated so a no-op PATCH never collides with itself.
 * The DB unique index is the race-safe backstop; this is the friendly pre-check (Issue 2).
 */
export async function tenderNumberExists(
  tenderNumber: string,
  excludeId?: string,
  db: Db = prisma,
): Promise<boolean> {
  return (
    (await db.tender.count({
      where: { tenderNumber, ...(excludeId ? { id: { not: excludeId } } : {}) },
    })) > 0
  );
}

export async function create(data: Prisma.TenderUncheckedCreateInput, db: Db = prisma): Promise<TenderRow> {
  return db.tender.create({ data, include: tenderInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<TenderRow | null> {
  return db.tender.findUnique({ where: { id }, include: tenderInclude });
}

export async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<TenderRow | null> {
  if (!opts.public) return prisma.tender.findUnique({ where: { slug }, include: tenderInclude });
  return prisma.tender.findFirst({ where: { ...buildWhere({}, { public: true }), slug }, include: tenderInclude });
}

export async function update(id: string, data: Prisma.TenderUncheckedUpdateInput, db: Db = prisma): Promise<TenderRow> {
  return db.tender.update({ where: { id }, data, include: tenderInclude });
}

export async function list(
  f: TenderFilters,
  skip: number,
  take: number,
  opts: TenderQueryOptions,
): Promise<{ rows: TenderRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.TenderOrderByWithRelationInput = {
    [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction,
  };
  const [rows, total] = await Promise.all([
    prisma.tender.findMany({ where, include: tenderInclude, orderBy, skip, take }),
    prisma.tender.count({ where }),
  ]);
  return { rows, total };
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

/** Validate the tender type exists AND is active. Returns field-keyed errors ({} when all valid). */
export interface TenderRefs {
  tenderTypeId?: string;
}

export async function validateReferences(refs: TenderRefs): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};
  if (refs.tenderTypeId !== undefined) {
    const row = await prisma.tenderType.findUnique({ where: { id: refs.tenderTypeId }, select: { isActive: true } });
    if (!row) errors.tender_type_id = ['Tender type not found.'];
    else if (!row.isActive) errors.tender_type_id = ['Tender type is inactive.'];
  }
  return errors;
}

export const tenderRepository = {
  slugExists,
  tenderNumberExists,
  create,
  findById,
  findBySlug,
  update,
  list,
  transaction,
  validateReferences,
};
