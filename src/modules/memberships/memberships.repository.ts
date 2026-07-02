/**
 * Institutional Membership repository — the ONLY Prisma caller for this module (coding-standards
 * §6). Encapsulates the public-visibility predicate so public vs admin queries differ only by it;
 * applies the ordering allow-list; validates references (institution + DU org exist; district +
 * reporting period exist and are active masters). Returns entities, never DTOs.
 *
 * References are validated directly against Prisma here (the same established pattern as
 * events.repository / documents.repository): existence/activation checks are read-only lookups, not
 * another module's repository surface, so the cross-module boundary (call services, never another
 * repository) is respected.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type {
  MembershipFilters,
  MembershipOrderingField,
  MembershipLevel,
  MembershipType,
} from './memberships.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

/** Detail/summary include — the linked Institution, District Union org, District, Reporting Period. */
const membershipInclude = {
  institution: true,
  districtUnion: true,
  district: true,
  reportingPeriod: true,
} satisfies Prisma.InstitutionalMembershipInclude;

export type MembershipRow = Prisma.InstitutionalMembershipGetPayload<{
  include: typeof membershipInclude;
}>;

const ORDER_COLUMN: Record<
  MembershipOrderingField,
  keyof Prisma.InstitutionalMembershipOrderByWithRelationInput
> = {
  display_order: 'displayOrder',
  join_date: 'joinDate',
  published_at: 'publishedAt',
  created_at: 'createdAt',
};

export interface MembershipQueryOptions {
  public?: boolean;
  ordering: { field: MembershipOrderingField; direction: 'asc' | 'desc' };
}

/** Build the Prisma `where` from validated filters. Exported for unit testing (pure, DB-free). */
export function buildWhere(
  f: MembershipFilters,
  opts: { public?: boolean },
): Prisma.InstitutionalMembershipWhereInput {
  const where: Prisma.InstitutionalMembershipWhereInput = {};
  const and: Prisma.InstitutionalMembershipWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.InstitutionalMembershipWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.membershipLevel) where.membershipLevel = f.membershipLevel;
  if (f.membershipType) where.membershipType = f.membershipType;
  if (f.status) where.status = f.status;
  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;

  if (f.institution) {
    where.institution = isUuid(f.institution) ? { id: f.institution } : { slug: f.institution };
  }
  if (f.districtUnion) {
    where.districtUnion = isUuid(f.districtUnion)
      ? { id: f.districtUnion }
      : { slug: f.districtUnion };
  }
  if (f.district) {
    where.district = isUuid(f.district) ? { id: f.district } : { slug: f.district };
  }
  if (f.reportingPeriod) {
    where.reportingPeriod = isUuid(f.reportingPeriod)
      ? { id: f.reportingPeriod }
      : { slug: f.reportingPeriod };
  }
  if (f.year !== undefined) {
    where.joinDate = {
      gte: new Date(Date.UTC(f.year, 0, 1)),
      lt: new Date(Date.UTC(f.year + 1, 0, 1)),
    };
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.institutionalMembership.count({ where: { slug } })) > 0;
}

// ── Duplicate-prevention lookups (Issue 1) ──────────────────────────────────────
/**
 * Approved business uniqueness key (audit-critical-fixes Fix 2; feeds dashboard reports #10–#13):
 * institution × level × type × district-union × reporting-period. `districtUnionId`/`reportingPeriodId`
 * are nullable; passing `null` here yields `IS NULL`, so two NULLs are treated as equal — matching the
 * `NULLS NOT DISTINCT` database index.
 */
export interface MembershipBusinessKey {
  institutionId: string;
  membershipLevel: MembershipLevel;
  membershipType: MembershipType;
  districtUnionId: string | null;
  reportingPeriodId: string | null;
}

/** True when a membership with the same business key already exists (excluding `excludeId`). */
export async function businessKeyExists(
  key: MembershipBusinessKey,
  excludeId?: string,
  db: Db = prisma,
): Promise<boolean> {
  const where: Prisma.InstitutionalMembershipWhereInput = {
    institutionId: key.institutionId,
    membershipLevel: key.membershipLevel,
    membershipType: key.membershipType,
    districtUnionId: key.districtUnionId,
    reportingPeriodId: key.reportingPeriodId,
  };
  if (excludeId) where.id = { not: excludeId };
  return (await db.institutionalMembership.count({ where })) > 0;
}

/** True when another membership already carries this (non-null) membership number. */
export async function membershipNumberExists(
  membershipNumber: string,
  excludeId?: string,
  db: Db = prisma,
): Promise<boolean> {
  const where: Prisma.InstitutionalMembershipWhereInput = { membershipNumber };
  if (excludeId) where.id = { not: excludeId };
  return (await db.institutionalMembership.count({ where })) > 0;
}

export async function create(
  data: Prisma.InstitutionalMembershipUncheckedCreateInput,
  db: Db = prisma,
): Promise<MembershipRow> {
  return db.institutionalMembership.create({ data, include: membershipInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<MembershipRow | null> {
  return db.institutionalMembership.findUnique({ where: { id }, include: membershipInclude });
}

export async function findBySlug(
  slug: string,
  opts: { public?: boolean } = {},
): Promise<MembershipRow | null> {
  if (!opts.public)
    return prisma.institutionalMembership.findUnique({
      where: { slug },
      include: membershipInclude,
    });
  return prisma.institutionalMembership.findFirst({
    where: { ...buildWhere({}, { public: true }), slug },
    include: membershipInclude,
  });
}

export async function update(
  id: string,
  data: Prisma.InstitutionalMembershipUncheckedUpdateInput,
  db: Db = prisma,
): Promise<MembershipRow> {
  return db.institutionalMembership.update({ where: { id }, data, include: membershipInclude });
}

export async function list(
  f: MembershipFilters,
  skip: number,
  take: number,
  opts: MembershipQueryOptions,
): Promise<{ rows: MembershipRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.InstitutionalMembershipOrderByWithRelationInput[] = [
    { [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction },
  ];
  const [rows, total] = await Promise.all([
    prisma.institutionalMembership.findMany({
      where,
      include: membershipInclude,
      orderBy,
      skip,
      take,
    }),
    prisma.institutionalMembership.count({ where }),
  ]);
  return { rows, total };
}

/** Run a callback inside a transaction (bulk-upload creates all rows atomically). */
export async function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

// ── Reference / activation validation ──────────────────────────────────────────
export interface MembershipRefs {
  institutionId?: string;
  districtUnionId?: string | null;
  districtId?: string | null;
  reportingPeriodId?: string | null;
}

/**
 * Validate every supplied reference. Institutions are content records (no `is_active`); the FK
 * guarantees integrity, but we verify existence to return a clean 422 instead of a raw FK error.
 * District and Reporting Period are masters: they must exist AND be active. Returns field-keyed
 * errors ({} when all valid).
 */
export async function validateReferences(
  refs: MembershipRefs,
  db: Db = prisma,
): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};

  if (refs.institutionId !== undefined) {
    const row = await db.institution.findUnique({
      where: { id: refs.institutionId },
      select: { id: true },
    });
    if (!row) errors.institution_id = ['Institution not found.'];
  }
  if (refs.districtUnionId) {
    const row = await db.institution.findUnique({
      where: { id: refs.districtUnionId },
      select: { id: true },
    });
    if (!row) errors.district_union_id = ['District Union institution not found.'];
  }
  if (refs.districtId) {
    const row = await db.district.findUnique({
      where: { id: refs.districtId },
      select: { isActive: true },
    });
    if (!row) errors.district_id = ['District not found.'];
    else if (!row.isActive) errors.district_id = ['District is inactive.'];
  }
  if (refs.reportingPeriodId) {
    const row = await db.reportingPeriod.findUnique({
      where: { id: refs.reportingPeriodId },
      select: { isActive: true },
    });
    if (!row) errors.reporting_period_id = ['Reporting period not found.'];
    else if (!row.isActive) errors.reporting_period_id = ['Reporting period is inactive.'];
  }
  return errors;
}

/** Fetch an institution's name to seed the membership slug (no member title field exists). */
export async function institutionName(id: string, db: Db = prisma): Promise<string | null> {
  const row = await db.institution.findUnique({ where: { id }, select: { nameEn: true } });
  return row?.nameEn ?? null;
}

export const membershipRepository = {
  slugExists,
  businessKeyExists,
  membershipNumberExists,
  create,
  findById,
  findBySlug,
  update,
  list,
  transaction,
  validateReferences,
  institutionName,
};
