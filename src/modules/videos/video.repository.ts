/**
 * Video repository — the only Prisma caller for the videos module.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';

type Db = PrismaClient | Prisma.TransactionClient;

/** Allowed public ordering fields (API spec §5 videos: `display_order,-published_at`). */
export const VIDEO_ORDERING_FIELDS = ['display_order', 'published_at', 'created_at'] as const;
export type VideoOrderingField = (typeof VIDEO_ORDERING_FIELDS)[number];

const VIDEO_ORDER_COLUMN: Record<VideoOrderingField, keyof Prisma.VideoOrderByWithRelationInput> = {
  display_order: 'displayOrder',
  published_at: 'publishedAt',
  created_at: 'createdAt',
};

export interface VideoPublicListFilters {
  showOnHomepage?: boolean;
}

export async function slugExists(slug: string): Promise<boolean> {
  return (await prisma.video.count({ where: { slug } })) > 0;
}

export async function create(data: Prisma.VideoUncheckedCreateInput, db: Db = prisma) {
  return db.video.create({ data });
}

export async function findById(id: string) {
  return prisma.video.findUnique({ where: { id } });
}

/** Run a function inside a transaction (service orchestrates thumbnail-usage writes). */
export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

export interface VideoListFilters {
  publicationState?: 'draft' | 'published' | 'unpublished' | 'archived';
  showOnHomepage?: boolean;
  search?: string;
}

export async function list(f: VideoListFilters, skip: number, take: number, direction: 'asc' | 'desc') {
  const where: Prisma.VideoWhereInput = {};
  if (f.publicationState) where.publicationState = f.publicationState;
  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  if (f.search) where.titleEn = { contains: f.search, mode: 'insensitive' };
  const [rows, total] = await Promise.all([
    prisma.video.findMany({ where, orderBy: { createdAt: direction }, skip, take }),
    prisma.video.count({ where }),
  ]);
  return { rows, total };
}

export async function update(id: string, data: Prisma.VideoUncheckedUpdateInput, db: Db = prisma) {
  return db.video.update({ where: { id }, data });
}

// ── Public reads (visibility predicate) ─────────────────────────────────────────
/**
 * Public list — applies the single public-visibility predicate (published, visible, non-archived,
 * due) so drafts/archived/future/hidden videos never leak.
 */
export async function publicList(
  f: VideoPublicListFilters,
  skip: number,
  take: number,
  ordering: { field: VideoOrderingField; direction: 'asc' | 'desc' },
) {
  const where: Prisma.VideoWhereInput = { ...(publicVisibilityWhere() as Prisma.VideoWhereInput) };
  if (f.showOnHomepage !== undefined) where.showOnHomepage = f.showOnHomepage;
  const orderBy: Prisma.VideoOrderByWithRelationInput = {
    [VIDEO_ORDER_COLUMN[ordering.field]]: ordering.direction,
  };
  const [rows, total] = await Promise.all([
    prisma.video.findMany({ where, orderBy, skip, take }),
    prisma.video.count({ where }),
  ]);
  return { rows, total };
}

/** Public detail by slug — same visibility predicate. */
export async function findPublicBySlug(slug: string) {
  return prisma.video.findFirst({ where: { ...(publicVisibilityWhere() as Prisma.VideoWhereInput), slug } });
}

/** Count currently public homepage videos (excluding one id) — enforces the ≤3 cap. */
export async function countPublicHomepage(excludeId?: string): Promise<number> {
  return prisma.video.count({
    where: {
      showOnHomepage: true,
      publicationState: 'published',
      archivedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export const videoRepository = {
  slugExists,
  create,
  findById,
  list,
  publicList,
  findPublicBySlug,
  update,
  countPublicHomepage,
  transaction,
};
