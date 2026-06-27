/**
 * Enquiry repository — the ONLY Prisma caller for this module.
 *
 * Enquiries are not publishable content (no publication_state, slug, highlight). The admin list
 * filter spans spam_state, archived status, date range, enquiry type, and keyword search. There
 * is no public list — only public submit (POST) and admin read/patch/archive/export.
 *
 * source_ip_hash stores a hashed IP, never the raw IP (CMS requirements §4.12).
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import type { EnquiryFilters, EnquiryOrderingField } from './enquiries.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

const enquiryInclude = {
  enquiryType: true,
  commodity: true,
  programmeScheme: { select: { id: true, titleEn: true, shortCode: true } },
} satisfies Prisma.EnquiryInclude;

export type EnquiryRow = Prisma.EnquiryGetPayload<{ include: typeof enquiryInclude }>;

const ORDER_COLUMN: Record<EnquiryOrderingField, keyof Prisma.EnquiryOrderByWithRelationInput> = {
  submitted_at: 'submittedAt',
  created_at: 'createdAt',
};

export function buildWhere(f: EnquiryFilters): Prisma.EnquiryWhereInput {
  const where: Prisma.EnquiryWhereInput = {};
  const and: Prisma.EnquiryWhereInput[] = [];

  if (f.enquiryType) {
    where.enquiryType = isUuid(f.enquiryType) ? { id: f.enquiryType } : { slug: f.enquiryType };
  }
  if (f.spamState) where.spamState = f.spamState;
  if (f.archived === true) where.archivedAt = { not: null };
  else if (f.archived === false) where.archivedAt = null;
  if (f.commodityId) where.commodityId = f.commodityId;
  if (f.programmeId) where.programmeSchemeId = f.programmeId;

  if (f.dateFrom || f.dateTo) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (f.dateFrom) dateFilter.gte = f.dateFrom;
    if (f.dateTo) dateFilter.lte = f.dateTo;
    where.submittedAt = dateFilter;
  }

  if (f.search) {
    const q = f.search;
    and.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { organization: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function create(
  data: Prisma.EnquiryUncheckedCreateInput,
  db: Db = prisma,
): Promise<EnquiryRow> {
  return db.enquiry.create({ data, include: enquiryInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<EnquiryRow | null> {
  return db.enquiry.findUnique({ where: { id }, include: enquiryInclude });
}

export async function update(
  id: string,
  data: Prisma.EnquiryUncheckedUpdateInput,
  db: Db = prisma,
): Promise<EnquiryRow> {
  return db.enquiry.update({ where: { id }, data, include: enquiryInclude });
}

export async function list(
  f: EnquiryFilters,
  skip: number,
  take: number,
  opts: { field: EnquiryOrderingField; direction: 'asc' | 'desc' },
): Promise<{ rows: EnquiryRow[]; total: number }> {
  const where = buildWhere(f);
  const orderBy: Prisma.EnquiryOrderByWithRelationInput = {
    [ORDER_COLUMN[opts.field]]: opts.direction,
  };
  const [rows, total] = await Promise.all([
    prisma.enquiry.findMany({ where, include: enquiryInclude, orderBy, skip, take }),
    prisma.enquiry.count({ where }),
  ]);
  return { rows, total };
}

/** Fetch all rows matching the filters (no pagination) for export. Cap at 10 000 rows. */
export async function listAll(f: EnquiryFilters): Promise<EnquiryRow[]> {
  return prisma.enquiry.findMany({
    where: buildWhere(f),
    include: enquiryInclude,
    orderBy: { submittedAt: 'desc' },
    take: 10_000,
  });
}

/**
 * Validate that the enquiry type is active. Returns field-keyed errors ({} = valid).
 * Also checks optional commodity and programme scheme exist if provided.
 */
export async function validateReferences(refs: {
  enquiryTypeId: string;
  commodityId?: string;
  programmeSchemeId?: string;
}): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};

  const typeRow = await prisma.enquiryType.findUnique({
    where: { id: refs.enquiryTypeId },
    select: { isActive: true },
  });
  if (!typeRow) errors.enquiry_type_id = ['Enquiry type not found.'];
  else if (!typeRow.isActive) errors.enquiry_type_id = ['Enquiry type is inactive.'];

  if (refs.commodityId) {
    const c = await prisma.commodity.findUnique({
      where: { id: refs.commodityId },
      select: { id: true },
    });
    if (!c) errors.commodity_id = ['Commodity not found.'];
  }
  if (refs.programmeSchemeId) {
    const p = await prisma.programmeScheme.findUnique({
      where: { id: refs.programmeSchemeId },
      select: { id: true },
    });
    if (!p) errors.programme_scheme_id = ['Programme / scheme not found.'];
  }

  return errors;
}

export const enquiryRepository = {
  create,
  findById,
  update,
  list,
  listAll,
  buildWhere,
  validateReferences,
};
