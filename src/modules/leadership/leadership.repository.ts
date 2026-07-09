/**
 * Leadership repository — the ONLY Prisma caller for this module (coding-standards §6).
 * Encapsulates the public-visibility predicate so public vs admin queries differ only by it; applies
 * the ordering allow-list. Returns entities, never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { LeadershipFilters, LeadershipOrderingField } from './leadership.types';

type Db = PrismaClient | Prisma.TransactionClient;

/** Detail/summary include — the optional photo media asset. */
const leadershipInclude = { photoMedia: true } satisfies Prisma.LeadershipInclude;

export type LeadershipRow = Prisma.LeadershipGetPayload<{ include: typeof leadershipInclude }>;

const ORDER_COLUMN: Record<LeadershipOrderingField, keyof Prisma.LeadershipOrderByWithRelationInput> = {
  display_order: 'displayOrder',
  name_en: 'nameEn',
  published_at: 'publishedAt',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

export interface LeadershipQueryOptions {
  public?: boolean;
  ordering: { field: LeadershipOrderingField; direction: 'asc' | 'desc' };
}

/** Build the Prisma `where` from validated filters. Exported for unit testing (pure, DB-free). */
export function buildWhere(
  f: LeadershipFilters,
  opts: { public?: boolean },
): Prisma.LeadershipWhereInput {
  const where: Prisma.LeadershipWhereInput = {};
  const and: Prisma.LeadershipWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.LeadershipWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.search) {
    const q = f.search;
    and.push({
      OR: [
        { nameEn: { contains: q, mode: 'insensitive' } },
        { nameHi: { contains: q, mode: 'insensitive' } },
        { govtRoleEn: { contains: q, mode: 'insensitive' } },
        { govtRoleHi: { contains: q, mode: 'insensitive' } },
        { sidhkofedRoleEn: { contains: q, mode: 'insensitive' } },
        { sidhkofedRoleHi: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.leadership.count({ where: { slug } })) > 0;
}

export async function create(data: Prisma.LeadershipUncheckedCreateInput, db: Db = prisma): Promise<LeadershipRow> {
  return db.leadership.create({ data, include: leadershipInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<LeadershipRow | null> {
  return db.leadership.findUnique({ where: { id }, include: leadershipInclude });
}

export async function update(
  id: string,
  data: Prisma.LeadershipUncheckedUpdateInput,
  db: Db = prisma,
): Promise<LeadershipRow> {
  return db.leadership.update({ where: { id }, data, include: leadershipInclude });
}

export async function list(
  f: LeadershipFilters,
  skip: number,
  take: number,
  opts: LeadershipQueryOptions,
): Promise<{ rows: LeadershipRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.LeadershipOrderByWithRelationInput = {
    [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction,
  };
  const [rows, total] = await Promise.all([
    prisma.leadership.findMany({ where, include: leadershipInclude, orderBy, skip, take }),
    prisma.leadership.count({ where }),
  ]);
  return { rows, total };
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

export const leadershipRepository = {
  slugExists,
  create,
  findById,
  update,
  list,
  transaction,
};
