/**
 * Digital Service repository — the ONLY Prisma caller for this module (coding-standards §6).
 * Encapsulates the public-visibility predicate so public vs admin queries differ only by it; applies
 * the ordering allow-list. Returns entities, never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { DigitalServiceFilters, DigitalServiceOrderingField } from './digital-services.types';

type Db = PrismaClient | Prisma.TransactionClient;

/** Detail/summary include — the optional icon media asset. */
const digitalServiceInclude = { iconMedia: true } satisfies Prisma.DigitalServiceInclude;

export type DigitalServiceRow = Prisma.DigitalServiceGetPayload<{ include: typeof digitalServiceInclude }>;

const ORDER_COLUMN: Record<DigitalServiceOrderingField, keyof Prisma.DigitalServiceOrderByWithRelationInput> = {
  display_order: 'displayOrder',
  title_en: 'titleEn',
  published_at: 'publishedAt',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

export interface DigitalServiceQueryOptions {
  public?: boolean;
  ordering: { field: DigitalServiceOrderingField; direction: 'asc' | 'desc' };
}

/** Build the Prisma `where` from validated filters. Exported for unit testing (pure, DB-free). */
export function buildWhere(
  f: DigitalServiceFilters,
  opts: { public?: boolean },
): Prisma.DigitalServiceWhereInput {
  const where: Prisma.DigitalServiceWhereInput = {};
  const and: Prisma.DigitalServiceWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.DigitalServiceWhereInput);
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
        { descriptionEn: { contains: q, mode: 'insensitive' } },
        { descriptionHi: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.digitalService.count({ where: { slug } })) > 0;
}

export async function create(data: Prisma.DigitalServiceUncheckedCreateInput, db: Db = prisma): Promise<DigitalServiceRow> {
  return db.digitalService.create({ data, include: digitalServiceInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<DigitalServiceRow | null> {
  return db.digitalService.findUnique({ where: { id }, include: digitalServiceInclude });
}

export async function update(
  id: string,
  data: Prisma.DigitalServiceUncheckedUpdateInput,
  db: Db = prisma,
): Promise<DigitalServiceRow> {
  return db.digitalService.update({ where: { id }, data, include: digitalServiceInclude });
}

export async function list(
  f: DigitalServiceFilters,
  skip: number,
  take: number,
  opts: DigitalServiceQueryOptions,
): Promise<{ rows: DigitalServiceRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.DigitalServiceOrderByWithRelationInput = {
    [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction,
  };
  const [rows, total] = await Promise.all([
    prisma.digitalService.findMany({ where, include: digitalServiceInclude, orderBy, skip, take }),
    prisma.digitalService.count({ where }),
  ]);
  return { rows, total };
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

export const digitalServiceRepository = {
  slugExists,
  create,
  findById,
  update,
  list,
  transaction,
};
