/**
 * FAQ repository — the ONLY Prisma caller for this module (coding-standards §6). Encapsulates the
 * public-visibility predicate so public vs admin queries differ only by it; applies the ordering
 * allow-list. Page-key validity is a pure code-registry check done in the validators/query layer —
 * no DB lookup is needed for it (unlike master-FK references elsewhere).
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { FaqFilters, FaqOrderingField } from './faqs.types';

type Db = PrismaClient | Prisma.TransactionClient;

/** Detail/summary include — every page assignment for the FAQ, ordered for stable DTO output. */
const faqInclude = { pageAssignments: { orderBy: { pageKey: 'asc' } } } satisfies Prisma.FaqInclude;

export type FaqRow = Prisma.FaqGetPayload<{ include: typeof faqInclude }>;

const ORDER_COLUMN: Record<FaqOrderingField, keyof Prisma.FaqOrderByWithRelationInput> = {
  display_order: 'displayOrder',
  published_at: 'publishedAt',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

interface FaqQueryOptions {
  public?: boolean;
  ordering: { field: FaqOrderingField; direction: 'asc' | 'desc' };
}

/** Build the Prisma `where` from validated filters. Exported for unit testing (pure, DB-free). */
export function buildWhere(f: FaqFilters, opts: { public?: boolean }): Prisma.FaqWhereInput {
  const where: Prisma.FaqWhereInput = {};
  const and: Prisma.FaqWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.FaqWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.pageKey) {
    where.pageAssignments = { some: { pageKey: f.pageKey } };
  }
  if (f.search) {
    const q = f.search;
    and.push({
      OR: [
        { questionEn: { contains: q, mode: 'insensitive' } },
        { questionHi: { contains: q, mode: 'insensitive' } },
        { answerEn: { contains: q, mode: 'insensitive' } },
        { answerHi: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.faq.count({ where: { slug } })) > 0;
}

async function create(data: Prisma.FaqUncheckedCreateInput, db: Db = prisma): Promise<FaqRow> {
  return db.faq.create({ data, include: faqInclude });
}

async function findById(id: string, db: Db = prisma): Promise<FaqRow | null> {
  return db.faq.findUnique({ where: { id }, include: faqInclude });
}

async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<FaqRow | null> {
  if (!opts.public) return prisma.faq.findUnique({ where: { slug }, include: faqInclude });
  return prisma.faq.findFirst({ where: { ...buildWhere({}, { public: true }), slug }, include: faqInclude });
}

async function update(id: string, data: Prisma.FaqUncheckedUpdateInput, db: Db = prisma): Promise<FaqRow> {
  return db.faq.update({ where: { id }, data, include: faqInclude });
}

/**
 * List FAQs. With `f.pageKey` set: FAQs assigned to that page, ordered by the assignment's own
 * `display_order` then FAQ id (a one-to-many relation field can't be an `orderBy` target on the
 * `Faq` side in Prisma, so this path queries `FaqPageAssignment` directly and follows the `faq`
 * relation back). Without `f.pageKey`: the global /faqs directory, ordered by the requested field
 * (defaulting to `Faq.displayOrder`) then id.
 */
async function list(
  f: FaqFilters,
  skip: number,
  take: number,
  opts: FaqQueryOptions,
): Promise<{ rows: FaqRow[]; total: number }> {
  if (f.pageKey) {
    const faqWhere = buildWhere({ ...f, pageKey: undefined }, { public: opts.public });
    const assignmentWhere: Prisma.FaqPageAssignmentWhereInput = { pageKey: f.pageKey, faq: faqWhere };
    const [rows, total] = await Promise.all([
      prisma.faqPageAssignment.findMany({
        where: assignmentWhere,
        include: { faq: { include: faqInclude } },
        orderBy: [{ displayOrder: 'asc' }, { faqId: 'asc' }],
        skip,
        take,
      }),
      prisma.faqPageAssignment.count({ where: assignmentWhere }),
    ]);
    return { rows: rows.map((r) => r.faq), total };
  }

  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.FaqOrderByWithRelationInput[] = [
    { [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction },
    { id: 'asc' },
  ];
  const [rows, total] = await Promise.all([
    prisma.faq.findMany({ where, include: faqInclude, orderBy, skip, take }),
    prisma.faq.count({ where }),
  ]);
  return { rows, total };
}

/** Run a function inside a transaction (service orchestrates content + assignment writes). */
function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

/** Replace all of a FAQ's page assignments (delete + recreate — same shape as document tags/etc). */
async function setPageAssignments(
  faqId: string,
  assignments: Array<{ page_key: string; display_order: number }>,
  db: Db,
): Promise<void> {
  await db.faqPageAssignment.deleteMany({ where: { faqId } });
  if (assignments.length > 0) {
    await db.faqPageAssignment.createMany({
      data: assignments.map((a) => ({ faqId, pageKey: a.page_key, displayOrder: a.display_order })),
    });
  }
}

async function findAssignment(faqId: string, pageKey: string, db: Db = prisma) {
  return db.faqPageAssignment.findUnique({ where: { faqId_pageKey: { faqId, pageKey } } });
}

async function updateAssignmentOrder(faqId: string, pageKey: string, displayOrder: number, db: Db): Promise<void> {
  await db.faqPageAssignment.update({ where: { faqId_pageKey: { faqId, pageKey } }, data: { displayOrder } });
}

export const faqRepository = {
  slugExists,
  create,
  findById,
  findBySlug,
  update,
  list,
  transaction,
  setPageAssignments,
  findAssignment,
  updateAssignmentOrder,
};
