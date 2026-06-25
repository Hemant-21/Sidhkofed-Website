/**
 * Institution repository — the ONLY Prisma caller for the institutions module
 * (coding-standards §6). Encapsulates the public-visibility predicate so public vs admin
 * queries differ only by it; applies the ordering allow-list; validates master activation.
 * Returns entities, never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { InstitutionFilters, InstitutionOrderingField } from './institutions.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

/** Detail/summary include — masters + logo (institutions carry no own junction collections;
 *  reverse links are discovered via /events?institution=x and /documents?institution=x). */
const institutionInclude = {
  institutionType: true,
  district: true,
  logoMedia: true,
} satisfies Prisma.InstitutionInclude;

export type InstitutionRow = Prisma.InstitutionGetPayload<{ include: typeof institutionInclude }>;

const ORDER_COLUMN: Record<InstitutionOrderingField, keyof Prisma.InstitutionOrderByWithRelationInput> = {
  display_order: 'displayOrder',
  name_en: 'nameEn',
  published_at: 'publishedAt',
  created_at: 'createdAt',
};

export interface InstitutionQueryOptions {
  public?: boolean;
  ordering: { field: InstitutionOrderingField; direction: 'asc' | 'desc' };
}

/** Build the Prisma `where` from validated filters. Exported for unit testing (pure, DB-free). */
export function buildWhere(f: InstitutionFilters, opts: { public?: boolean }): Prisma.InstitutionWhereInput {
  const where: Prisma.InstitutionWhereInput = {};
  const and: Prisma.InstitutionWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.InstitutionWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.institutionType) {
    where.institutionType = isUuid(f.institutionType) ? { id: f.institutionType } : { slug: f.institutionType };
  }
  if (f.district) {
    where.district = isUuid(f.district) ? { id: f.district } : { slug: f.district };
  }
  if (f.search) {
    const q = f.search;
    and.push({
      OR: [
        { nameEn: { contains: q, mode: 'insensitive' } },
        { nameHi: { contains: q, mode: 'insensitive' } },
        { descriptionEn: { contains: q, mode: 'insensitive' } },
        { descriptionHi: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.institution.count({ where: { slug } })) > 0;
}

/**
 * Case-insensitive, trimmed duplicate-name detection (Issue 4). Returns true when another
 * institution already carries `nameEn` (ignoring surrounding whitespace and letter case). Pass
 * `excludeId` on update so a record never collides with itself. Independent of slug uniqueness.
 */
export async function nameExists(nameEn: string, excludeId: string | undefined, db: Db = prisma): Promise<boolean> {
  return (
    (await db.institution.count({
      where: {
        nameEn: { equals: nameEn.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })) > 0
  );
}

export async function create(data: Prisma.InstitutionUncheckedCreateInput, db: Db = prisma): Promise<InstitutionRow> {
  return db.institution.create({ data, include: institutionInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<InstitutionRow | null> {
  return db.institution.findUnique({ where: { id }, include: institutionInclude });
}

export async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<InstitutionRow | null> {
  if (!opts.public) return prisma.institution.findUnique({ where: { slug }, include: institutionInclude });
  return prisma.institution.findFirst({ where: { ...buildWhere({}, { public: true }), slug }, include: institutionInclude });
}

export async function update(id: string, data: Prisma.InstitutionUncheckedUpdateInput, db: Db = prisma): Promise<InstitutionRow> {
  return db.institution.update({ where: { id }, data, include: institutionInclude });
}

export async function list(
  f: InstitutionFilters,
  skip: number,
  take: number,
  opts: InstitutionQueryOptions,
): Promise<{ rows: InstitutionRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.InstitutionOrderByWithRelationInput = {
    [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction,
  };
  const [rows, total] = await Promise.all([
    prisma.institution.findMany({ where, include: institutionInclude, orderBy, skip, take }),
    prisma.institution.count({ where }),
  ]);
  return { rows, total };
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

/**
 * Validate referenced masters exist AND are active (FK Restrict guarantees existence; this adds
 * the active-status gate). Returns field-keyed errors ({} when all valid).
 */
export interface InstitutionRefs {
  institutionTypeId?: string;
  districtId?: string | null;
}

export async function validateReferences(refs: InstitutionRefs): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};
  if (refs.institutionTypeId !== undefined) {
    const row = await prisma.institutionType.findUnique({ where: { id: refs.institutionTypeId }, select: { isActive: true } });
    if (!row) errors.institution_type_id = ['Institution type not found.'];
    else if (!row.isActive) errors.institution_type_id = ['Institution type is inactive.'];
  }
  if (refs.districtId) {
    const row = await prisma.district.findUnique({ where: { id: refs.districtId }, select: { isActive: true } });
    if (!row) errors.district_id = ['District not found.'];
    else if (!row.isActive) errors.district_id = ['District is inactive.'];
  }
  return errors;
}

export const institutionRepository = {
  slugExists,
  nameExists,
  create,
  findById,
  findBySlug,
  update,
  list,
  transaction,
  validateReferences,
};
