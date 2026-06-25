/**
 * Programme repository — the ONLY Prisma caller for the programmes module (coding-standards §6).
 * Encapsulates the visibility predicate, ordering allow-list, junction writers (commodities,
 * permitted training types), and master-activation validation. Returns entities, never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type { ProgrammeFilters, ProgrammeOrderingField } from './programmes.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

const programmeInclude = {
  coverMedia: true,
  commodities: { include: { commodity: true } },
  permittedTrainingTypes: { include: { trainingType: true } },
} satisfies Prisma.ProgrammeSchemeInclude;

export type ProgrammeRow = Prisma.ProgrammeSchemeGetPayload<{ include: typeof programmeInclude }>;

/** Lightweight summary — cover only, no relation collections. */
const programmeSummaryInclude = { coverMedia: true } satisfies Prisma.ProgrammeSchemeInclude;
export type ProgrammeSummaryRow = Prisma.ProgrammeSchemeGetPayload<{ include: typeof programmeSummaryInclude }>;

const ORDER_COLUMN: Record<ProgrammeOrderingField, keyof Prisma.ProgrammeSchemeOrderByWithRelationInput> = {
  display_order: 'displayOrder',
  published_at: 'publishedAt',
  start_date: 'startDate',
  title_en: 'titleEn',
  created_at: 'createdAt',
};

export interface ProgrammeQueryOptions {
  public?: boolean;
  ordering: { field: ProgrammeOrderingField; direction: 'asc' | 'desc' };
}

export function buildWhere(f: ProgrammeFilters, opts: { public?: boolean }): Prisma.ProgrammeSchemeWhereInput {
  const where: Prisma.ProgrammeSchemeWhereInput = {};
  const and: Prisma.ProgrammeSchemeWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.ProgrammeSchemeWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.commodity) {
    const sel = isUuid(f.commodity) ? { id: f.commodity } : { slug: f.commodity };
    where.commodities = { some: { commodity: sel } };
  }
  if (f.year) {
    where.startDate = {
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
        { shortCode: { contains: q, mode: 'insensitive' } },
        { summaryEn: { contains: q, mode: 'insensitive' } },
        { descriptionEn: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.programmeScheme.count({ where: { slug } })) > 0;
}

/**
 * Case-insensitive duplicate `title_en` check (codex §4.2 "Duplicate-name validation required").
 * Slug uniqueness is insufficient — the slugger de-duplicates by appending a suffix, so two
 * programmes named "Health Scheme" would both be created. `excludeId` skips the record being
 * updated. Compares trimmed titles via Postgres case-insensitive equality.
 */
export async function nameExists(titleEn: string, excludeId: string | undefined, db: Db = prisma): Promise<boolean> {
  return (
    (await db.programmeScheme.count({
      where: {
        titleEn: { equals: titleEn.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })) > 0
  );
}

export async function create(data: Prisma.ProgrammeSchemeUncheckedCreateInput, db: Db = prisma): Promise<ProgrammeRow> {
  return db.programmeScheme.create({ data, include: programmeInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<ProgrammeRow | null> {
  return db.programmeScheme.findUnique({ where: { id }, include: programmeInclude });
}

export async function findBySlug(slug: string, opts: { public?: boolean } = {}): Promise<ProgrammeRow | null> {
  if (!opts.public) return prisma.programmeScheme.findUnique({ where: { slug }, include: programmeInclude });
  return prisma.programmeScheme.findFirst({ where: { ...buildWhere({}, { public: true }), slug }, include: programmeInclude });
}

export async function update(id: string, data: Prisma.ProgrammeSchemeUncheckedUpdateInput, db: Db = prisma): Promise<ProgrammeRow> {
  return db.programmeScheme.update({ where: { id }, data, include: programmeInclude });
}

export async function list(
  f: ProgrammeFilters,
  skip: number,
  take: number,
  opts: ProgrammeQueryOptions,
): Promise<{ rows: ProgrammeSummaryRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.ProgrammeSchemeOrderByWithRelationInput = {
    [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction,
  };
  const [rows, total] = await Promise.all([
    prisma.programmeScheme.findMany({ where, include: programmeSummaryInclude, orderBy, skip, take }),
    prisma.programmeScheme.count({ where }),
  ]);
  return { rows, total };
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

// ── Junction writers (called inside the service's transaction) ─────────────────
export async function setCommodities(programmeSchemeId: string, commodityIds: string[], db: Db): Promise<void> {
  await db.programmeCommodity.deleteMany({ where: { programmeSchemeId } });
  if (commodityIds.length > 0) {
    await db.programmeCommodity.createMany({ data: commodityIds.map((commodityId) => ({ programmeSchemeId, commodityId })) });
  }
}

export async function setPermittedTrainingTypes(programmeSchemeId: string, trainingTypeIds: string[], db: Db): Promise<void> {
  await db.programmePermittedTrainingType.deleteMany({ where: { programmeSchemeId } });
  if (trainingTypeIds.length > 0) {
    await db.programmePermittedTrainingType.createMany({
      data: trainingTypeIds.map((trainingTypeId) => ({ programmeSchemeId, trainingTypeId })),
    });
  }
}

/** Validate referenced masters exist AND are active. Returns field-keyed errors ({} when valid). */
export interface ProgrammeRefs {
  commodityIds?: string[];
  permittedTrainingTypeIds?: string[];
}

export async function validateReferences(refs: ProgrammeRefs): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};
  await assertActiveSet('commodity_ids', refs.commodityIds, (ids) =>
    prisma.commodity.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } }), errors);
  await assertActiveSet('permitted_training_type_ids', refs.permittedTrainingTypeIds, (ids) =>
    prisma.trainingType.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } }), errors);
  return errors;
}

async function assertActiveSet(
  field: string,
  ids: string[] | undefined,
  query: (ids: string[]) => Promise<Array<{ id: string }>>,
  errors: Record<string, string[]>,
): Promise<void> {
  if (!ids || ids.length === 0) return;
  const unique = [...new Set(ids)];
  const found = new Set((await query(unique)).map((r) => r.id));
  const missing = unique.filter((id) => !found.has(id));
  if (missing.length > 0) errors[field] = missing.map((id) => `Reference ${id} not found or inactive.`);
}

export const programmeRepository = {
  slugExists,
  nameExists,
  create,
  findById,
  findBySlug,
  update,
  list,
  transaction,
  setCommodities,
  setPermittedTrainingTypes,
  validateReferences,
};
