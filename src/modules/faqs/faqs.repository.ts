/**
 * FAQ repository — the ONLY Prisma caller for this module (coding-standards §6). Encapsulates the
 * public-visibility predicate so public vs admin queries differ only by it; applies the ordering
 * allow-list; validates master activation. Returns entities, never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { FaqFilters, FaqOrderingField } from './faqs.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

/** Detail/summary include — the FAQ category master only. */
const faqInclude = { faqCategory: true } satisfies Prisma.FaqInclude;

export type FaqRow = Prisma.FaqGetPayload<{ include: typeof faqInclude }>;

const ORDER_COLUMN: Record<FaqOrderingField, keyof Prisma.FaqOrderByWithRelationInput> = {
  display_order: 'displayOrder',
  published_at: 'publishedAt',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

export interface FaqQueryOptions {
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

  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.faqCategory) {
    where.faqCategory = isUuid(f.faqCategory) ? { id: f.faqCategory } : { slug: f.faqCategory };
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

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.faq.count({ where: { slug } })) > 0;
}

export async function create(data: Prisma.FaqUncheckedCreateInput, db: Db = prisma): Promise<FaqRow> {
  return db.faq.create({ data, include: faqInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<FaqRow | null> {
  return db.faq.findUnique({ where: { id }, include: faqInclude });
}

export async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<FaqRow | null> {
  if (!opts.public) return prisma.faq.findUnique({ where: { slug }, include: faqInclude });
  return prisma.faq.findFirst({ where: { ...buildWhere({}, { public: true }), slug }, include: faqInclude });
}

export async function update(id: string, data: Prisma.FaqUncheckedUpdateInput, db: Db = prisma): Promise<FaqRow> {
  return db.faq.update({ where: { id }, data, include: faqInclude });
}

/**
 * List FAQs. Ordering is the requested field, but FAQs are grouped by their category first (category
 * display order, then name) so the public list reads "by category/display order" (API spec §5). The
 * requested field acts as the within-group ordering.
 */
export async function list(
  f: FaqFilters,
  skip: number,
  take: number,
  opts: FaqQueryOptions,
): Promise<{ rows: FaqRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.FaqOrderByWithRelationInput[] = [
    { faqCategory: { displayOrder: 'asc' } },
    { faqCategory: { nameEn: 'asc' } },
    { [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction },
  ];
  const [rows, total] = await Promise.all([
    prisma.faq.findMany({ where, include: faqInclude, orderBy, skip, take }),
    prisma.faq.count({ where }),
  ]);
  return { rows, total };
}

/** Validate the FAQ category exists AND is active. Returns field-keyed errors ({} when all valid). */
export interface FaqRefs {
  faqCategoryId?: string | null;
}

export async function validateReferences(refs: FaqRefs): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};
  if (refs.faqCategoryId) {
    const row = await prisma.faqCategory.findUnique({ where: { id: refs.faqCategoryId }, select: { isActive: true } });
    if (!row) errors.faq_category_id = ['FAQ category not found.'];
    else if (!row.isActive) errors.faq_category_id = ['FAQ category is inactive.'];
  }
  return errors;
}

export const faqRepository = {
  slugExists,
  create,
  findById,
  findBySlug,
  update,
  list,
  validateReferences,
};
