/**
 * Official Communication repository — the ONLY Prisma caller for this module (coding-standards §6).
 * Encapsulates the public-visibility predicate so public vs admin queries differ only by it; applies
 * the ordering allow-list; validates master activation + the optional linked document. Returns
 * entities, never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';
import type {
  OfficialCommunicationFilters,
  OfficialCommunicationOrderingField,
} from './official-communications.types';

type Db = PrismaClient | Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

/** Detail/summary include — communication type + linked document (with its type + file asset so the
 *  shared `toDocumentRef` mapper can build a compact reference). */
const communicationInclude = {
  communicationType: true,
  document: { include: { documentType: true, fileAsset: true } },
} satisfies Prisma.OfficialCommunicationInclude;

export type OfficialCommunicationRow = Prisma.OfficialCommunicationGetPayload<{
  include: typeof communicationInclude;
}>;

const ORDER_COLUMN: Record<
  OfficialCommunicationOrderingField,
  keyof Prisma.OfficialCommunicationOrderByWithRelationInput
> = {
  issue_date: 'issueDate',
  published_at: 'publishedAt',
  display_order: 'displayOrder',
  created_at: 'createdAt',
};

export interface OfficialCommunicationQueryOptions {
  public?: boolean;
  ordering: { field: OfficialCommunicationOrderingField; direction: 'asc' | 'desc' };
}

/** Build the Prisma `where` from validated filters. Exported for unit testing (pure, DB-free). */
export function buildWhere(
  f: OfficialCommunicationFilters,
  opts: { public?: boolean },
): Prisma.OfficialCommunicationWhereInput {
  const where: Prisma.OfficialCommunicationWhereInput = {};
  const and: Prisma.OfficialCommunicationWhereInput[] = [];

  if (opts.public) {
    and.push(publicVisibilityWhere() as Prisma.OfficialCommunicationWhereInput);
  } else if (f.publicationState) {
    where.publicationState = f.publicationState;
  }

  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.highlight) where.highlightType = f.highlight as Prisma.OfficialCommunicationWhereInput['highlightType'];
  if (f.communicationType) {
    where.communicationType = isUuid(f.communicationType)
      ? { id: f.communicationType }
      : { slug: f.communicationType };
  }
  if (f.year) {
    where.issueDate = {
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
        { summaryHi: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { issuingAuthority: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function slugExists(slug: string, db: Db = prisma): Promise<boolean> {
  return (await db.officialCommunication.count({ where: { slug } })) > 0;
}

export async function create(
  data: Prisma.OfficialCommunicationUncheckedCreateInput,
  db: Db = prisma,
): Promise<OfficialCommunicationRow> {
  return db.officialCommunication.create({ data, include: communicationInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<OfficialCommunicationRow | null> {
  return db.officialCommunication.findUnique({ where: { id }, include: communicationInclude });
}

export async function findBySlug(
  slug: string,
  opts: { public?: boolean } = {},
): Promise<OfficialCommunicationRow | null> {
  if (!opts.public) return prisma.officialCommunication.findUnique({ where: { slug }, include: communicationInclude });
  return prisma.officialCommunication.findFirst({
    where: { ...buildWhere({}, { public: true }), slug },
    include: communicationInclude,
  });
}

export async function update(
  id: string,
  data: Prisma.OfficialCommunicationUncheckedUpdateInput,
  db: Db = prisma,
): Promise<OfficialCommunicationRow> {
  return db.officialCommunication.update({ where: { id }, data, include: communicationInclude });
}

export async function list(
  f: OfficialCommunicationFilters,
  skip: number,
  take: number,
  opts: OfficialCommunicationQueryOptions,
): Promise<{ rows: OfficialCommunicationRow[]; total: number }> {
  const where = buildWhere(f, { public: opts.public });
  const orderBy: Prisma.OfficialCommunicationOrderByWithRelationInput = {
    [ORDER_COLUMN[opts.ordering.field]]: opts.ordering.direction,
  };
  const [rows, total] = await Promise.all([
    prisma.officialCommunication.findMany({ where, include: communicationInclude, orderBy, skip, take }),
    prisma.officialCommunication.count({ where }),
  ]);
  return { rows, total };
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

/**
 * Validate referenced masters/documents. The communication type must exist AND be active; the
 * optional linked document must exist (FK Restrict guarantees integrity, but we return a clean 422
 * instead of a raw FK error). Returns field-keyed errors ({} when all valid).
 */
export interface OfficialCommunicationRefs {
  communicationTypeId?: string;
  documentId?: string | null;
}

export async function validateReferences(refs: OfficialCommunicationRefs): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};
  if (refs.communicationTypeId !== undefined) {
    const row = await prisma.communicationType.findUnique({
      where: { id: refs.communicationTypeId },
      select: { isActive: true },
    });
    if (!row) errors.communication_type_id = ['Communication type not found.'];
    else if (!row.isActive) errors.communication_type_id = ['Communication type is inactive.'];
  }
  if (refs.documentId) {
    const row = await prisma.document.findUnique({ where: { id: refs.documentId }, select: { id: true } });
    if (!row) errors.document_id = ['Document not found.'];
  }
  return errors;
}

export const officialCommunicationRepository = {
  slugExists,
  create,
  findById,
  findBySlug,
  update,
  list,
  transaction,
  validateReferences,
};
