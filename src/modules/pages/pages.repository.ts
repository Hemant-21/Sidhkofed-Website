/**
 * Page repository — the ONLY Prisma caller for this module (coding-standards §6). Encapsulates the
 * public-visibility predicate so public vs admin queries differ only by it; applies the ordering
 * allow-list. Returns entities, never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { PageFilters, PageOrderingField } from './pages.types';

type Db = PrismaClient | Prisma.TransactionClient;

export type PageRow = Prisma.PageGetPayload<Record<string, never>>;

const ORDER_COLUMN: Record<PageOrderingField, keyof Prisma.PageOrderByWithRelationInput> = {
  display_order: 'displayOrder',
  title_en: 'titleEn',
  published_at: 'publishedAt',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

export interface PageQueryOptions {
  public?: boolean;
  ordering: { field: PageOrderingField; direction: 'asc' | 'desc' };
}

/** Build the Prisma `where` from validated filters. Exported for unit testing (pure, DB-free). */
export function buildWhere(f: PageFilters, opts: { public?: boolean }): Prisma.PageWhereInput {
  const where: Prisma.PageWhereInput = {};
  const and: Prisma.PageWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.PageWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.search) {
    const q = f.search;
    and.push({
      OR: [
        { titleEn: { contains: q, mode: 'insensitive' } },
        { titleHi: { contains: q, mode: 'insensitive' } },
        { bodyEn: { contains: q, mode: 'insensitive' } },
        { bodyHi: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.page.count({ where: { slug } })) > 0;
}

export async function create(data: Prisma.PageUncheckedCreateInput, db: Db = prisma): Promise<PageRow> {
  return db.page.create({ data });
}

export async function findById(id: string, db: Db = prisma): Promise<PageRow | null> {
  return db.page.findUnique({ where: { id } });
}

export async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<PageRow | null> {
  if (!opts.public) return prisma.page.findUnique({ where: { slug } });
  return prisma.page.findFirst({ where: { ...buildWhere({}, { public: true }), slug } });
}

export async function update(id: string, data: Prisma.PageUncheckedUpdateInput, db: Db = prisma): Promise<PageRow> {
  return db.page.update({ where: { id }, data });
}

export async function list(
  f: PageFilters,
  skip: number,
  take: number,
  opts: PageQueryOptions,
): Promise<{ rows: PageRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.PageOrderByWithRelationInput = {
    [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction,
  };
  const [rows, total] = await Promise.all([
    prisma.page.findMany({ where, orderBy, skip, take }),
    prisma.page.count({ where }),
  ]);
  return { rows, total };
}

export const pageRepository = {
  slugExists,
  create,
  findById,
  findBySlug,
  update,
  list,
};
