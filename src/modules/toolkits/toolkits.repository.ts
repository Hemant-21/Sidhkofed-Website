/**
 * Toolkit repository — the ONLY Prisma caller for the toolkits aggregate root (coding-standards §6).
 * Encapsulates the visibility predicate, ordering allow-list, and reference validation (programme +
 * commodity). Returns entities, never DTOs. Toolkit items are owned by the items sub-repository.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { ToolkitFilters, ToolkitOrderingField } from './toolkits.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

// Public reads must not surface a draft/archived/future-scheduled programme through a published
// toolkit. Prisma cannot filter an included to-one relation, so we also select the programme's
// publishing-workflow fields and let the public DTO mapper apply `isPubliclyVisible` (Issue 7).
const programmeRefSelect = {
  select: {
    id: true,
    slug: true,
    titleEn: true,
    titleHi: true,
    shortCode: true,
    publicationState: true,
    publicVisibility: true,
    archivedAt: true,
    publishStartAt: true,
  },
} as const;

const toolkitInclude = {
  coverMedia: true,
  commodity: true,
  programmeScheme: programmeRefSelect,
  items: { orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.ToolkitInclude;

export type ToolkitRow = Prisma.ToolkitGetPayload<{ include: typeof toolkitInclude }>;

/** Lightweight summary — refs only, no item collection. */
const toolkitSummaryInclude = {
  coverMedia: true,
  commodity: true,
  programmeScheme: programmeRefSelect,
} satisfies Prisma.ToolkitInclude;
export type ToolkitSummaryRow = Prisma.ToolkitGetPayload<{ include: typeof toolkitSummaryInclude }>;

const ORDER_COLUMN: Record<ToolkitOrderingField, keyof Prisma.ToolkitOrderByWithRelationInput> = {
  display_order: 'displayOrder',
  published_at: 'publishedAt',
  title_en: 'titleEn',
  created_at: 'createdAt',
};

export interface ToolkitQueryOptions {
  public?: boolean;
  ordering: { field: ToolkitOrderingField; direction: 'asc' | 'desc' };
}

export function buildWhere(f: ToolkitFilters, opts: { public?: boolean }): Prisma.ToolkitWhereInput {
  const where: Prisma.ToolkitWhereInput = {};
  const and: Prisma.ToolkitWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.ToolkitWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.commodity) {
    where.commodity = isUuid(f.commodity) ? { id: f.commodity } : { slug: f.commodity };
  }
  if (f.programme) {
    where.programmeScheme = isUuid(f.programme) ? { id: f.programme } : { slug: f.programme };
  }
  if (f.search) {
    const q = f.search;
    and.push({
      OR: [
        { titleEn: { contains: q, mode: 'insensitive' } },
        { titleHi: { contains: q, mode: 'insensitive' } },
        { summaryEn: { contains: q, mode: 'insensitive' } },
        { descriptionEn: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.toolkit.count({ where: { slug } })) > 0;
}

export async function create(data: Prisma.ToolkitUncheckedCreateInput, db: Db = prisma): Promise<ToolkitRow> {
  return db.toolkit.create({ data, include: toolkitInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<ToolkitRow | null> {
  return db.toolkit.findUnique({ where: { id }, include: toolkitInclude });
}

export async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<ToolkitRow | null> {
  if (!opts.public) return prisma.toolkit.findUnique({ where: { slug }, include: toolkitInclude });
  return prisma.toolkit.findFirst({ where: { ...buildWhere({}, { public: true }), slug }, include: toolkitInclude });
}

export async function update(id: string, data: Prisma.ToolkitUncheckedUpdateInput, db: Db = prisma): Promise<ToolkitRow> {
  return db.toolkit.update({ where: { id }, data, include: toolkitInclude });
}

export async function list(
  f: ToolkitFilters,
  skip: number,
  take: number,
  opts: ToolkitQueryOptions,
): Promise<{ rows: ToolkitSummaryRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.ToolkitOrderByWithRelationInput = {
    [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction,
  };
  const [rows, total] = await Promise.all([
    prisma.toolkit.findMany({ where, include: toolkitSummaryInclude, orderBy, skip, take }),
    prisma.toolkit.count({ where }),
  ]);
  return { rows, total };
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

/** Validate referenced programme (non-archived) + commodity (active). Returns field-keyed errors. */
export interface ToolkitRefs {
  programmeSchemeId?: string | null;
  commodityId?: string | null;
}

export async function validateReferences(refs: ToolkitRefs): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};
  if (refs.programmeSchemeId) {
    const programme = await prisma.programmeScheme.findFirst({
      where: { id: refs.programmeSchemeId, archivedAt: null },
      select: { id: true },
    });
    if (!programme) errors.programme_scheme_id = ['Programme not found or archived.'];
  }
  if (refs.commodityId) {
    const commodity = await prisma.commodity.findFirst({
      where: { id: refs.commodityId, isActive: true },
      select: { id: true },
    });
    if (!commodity) errors.commodity_id = ['Commodity not found or inactive.'];
  }
  return errors;
}

export const toolkitRepository = {
  slugExists,
  create,
  findById,
  findBySlug,
  update,
  list,
  transaction,
  validateReferences,
};
