/**
 * Event News repository — the ONLY Prisma caller for the derived-news module. Encapsulates the
 * visibility predicate, ordering allow-list, and the source-event reference. Returns entities.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { NewsFilters, NewsOrderingField } from './news.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

const newsInclude = {
  coverMedia: true,
  event: { include: { eventType: true } },
} satisfies Prisma.EventNewsInclude;

export type NewsRow = Prisma.EventNewsGetPayload<{ include: typeof newsInclude }>;

const ORDER_COLUMN: Record<NewsOrderingField, keyof Prisma.EventNewsOrderByWithRelationInput> = {
  news_published_at: 'newsPublishedAt',
  published_at: 'publishedAt',
  display_order: 'displayOrder',
  created_at: 'createdAt',
};

export interface NewsQueryOptions {
  public?: boolean;
  ordering: { field: NewsOrderingField; direction: 'asc' | 'desc' };
}

export function buildWhere(f: NewsFilters, opts: { public?: boolean }): Prisma.EventNewsWhereInput {
  const where: Prisma.EventNewsWhereInput = {};
  const and: Prisma.EventNewsWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.EventNewsWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.event) where.event = isUuid(f.event) ? { id: f.event } : { slug: f.event };
  if (f.year) {
    where.newsPublishedAt = {
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
        { bodyEn: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.eventNews.count({ where: { slug } })) > 0;
}
/** Duplicate-news guard (Issue 3): an event may be published as news at most once. */
export async function existsForEvent(eventId: string, db: Db = prisma): Promise<boolean> {
  return (await db.eventNews.count({ where: { eventId } })) > 0;
}
export async function create(data: Prisma.EventNewsUncheckedCreateInput, db: Db = prisma): Promise<NewsRow> {
  return db.eventNews.create({ data, include: newsInclude });
}
export async function findById(id: string, db: Db = prisma): Promise<NewsRow | null> {
  return db.eventNews.findUnique({ where: { id }, include: newsInclude });
}
export async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<NewsRow | null> {
  if (!opts.public) return prisma.eventNews.findUnique({ where: { slug }, include: newsInclude });
  return prisma.eventNews.findFirst({ where: { ...buildWhere({}, { public: true }), slug }, include: newsInclude });
}
export async function update(id: string, data: Prisma.EventNewsUncheckedUpdateInput, db: Db = prisma): Promise<NewsRow> {
  return db.eventNews.update({ where: { id }, data, include: newsInclude });
}
export async function list(
  f: NewsFilters,
  skip: number,
  take: number,
  opts: NewsQueryOptions,
): Promise<{ rows: NewsRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.EventNewsOrderByWithRelationInput = { [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction };
  const [rows, total] = await Promise.all([
    prisma.eventNews.findMany({ where, include: newsInclude, orderBy, skip, take }),
    prisma.eventNews.count({ where }),
  ]);
  return { rows, total };
}
export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

export const newsRepository = {
  slugExists,
  existsForEvent,
  create,
  findById,
  findBySlug,
  update,
  list,
  transaction,
};
