/**
 * Gallery repository — the only Prisma caller for the galleries module. Image link/unlink
 * runs inside transactions together with media-usage writes (handled in the service).
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

const galleryInclude = {
  coverMedia: true,
  images: { include: { media: true }, orderBy: { displayOrder: 'asc' } },
} satisfies Prisma.GalleryInclude;

export type GalleryRow = Prisma.GalleryGetPayload<{ include: typeof galleryInclude }>;

// Lightweight LIST shape (Issue 11): cover + image COUNT only — never the image rows. The
// full image collection is loaded by the detail query (`galleryInclude`) instead.
const gallerySummaryInclude = {
  coverMedia: true,
  _count: { select: { images: true } },
} satisfies Prisma.GalleryInclude;

export type GallerySummaryRow = Prisma.GalleryGetPayload<{ include: typeof gallerySummaryInclude }>;

export async function slugExists(slug: string): Promise<boolean> {
  return (await prisma.gallery.count({ where: { slug } })) > 0;
}

export async function create(data: Prisma.GalleryUncheckedCreateInput, db: Db = prisma): Promise<GalleryRow> {
  return db.gallery.create({ data, include: galleryInclude });
}

export async function findById(id: string): Promise<GalleryRow | null> {
  return prisma.gallery.findUnique({ where: { id }, include: galleryInclude });
}

export interface GalleryListFilters {
  publicationState?: 'draft' | 'published' | 'unpublished' | 'archived';
  search?: string;
}

/** Summary list (Issue 11): cover + image count, NOT the full image rows. */
export async function list(f: GalleryListFilters, skip: number, take: number, direction: 'asc' | 'desc') {
  const where: Prisma.GalleryWhereInput = {};
  if (f.publicationState) where.publicationState = f.publicationState;
  if (f.search) where.titleEn = { contains: f.search, mode: 'insensitive' };
  const [rows, total] = await Promise.all([
    prisma.gallery.findMany({ where, include: gallerySummaryInclude, orderBy: { createdAt: direction }, skip, take }),
    prisma.gallery.count({ where }),
  ]);
  return { rows, total };
}

export async function update(id: string, data: Prisma.GalleryUncheckedUpdateInput, db: Db = prisma): Promise<GalleryRow> {
  return db.gallery.update({ where: { id }, data, include: galleryInclude });
}

/** Run a function inside a transaction (service orchestrates image link/usage writes). */
export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

// ── Gallery images ───────────────────────────────────────────────────────────
export async function addImage(
  galleryId: string,
  data: { mediaId: string; displayOrder: number; captionEn?: string | null; captionHi?: string | null },
  db: Db = prisma,
) {
  return db.galleryImage.create({ data: { galleryId, ...data } });
}

export async function findImage(galleryId: string, imageId: string, db: Db = prisma) {
  return db.galleryImage.findFirst({ where: { id: imageId, galleryId } });
}

export async function updateImage(
  imageId: string,
  data: { displayOrder?: number; captionEn?: string | null; captionHi?: string | null },
  db: Db = prisma,
) {
  return db.galleryImage.update({ where: { id: imageId }, data });
}

export async function deleteImage(imageId: string, db: Db = prisma) {
  return db.galleryImage.delete({ where: { id: imageId } });
}

export async function nextImageOrder(galleryId: string, db: Db = prisma): Promise<number> {
  const agg = await db.galleryImage.aggregate({ where: { galleryId }, _max: { displayOrder: true } });
  return (agg._max.displayOrder ?? -1) + 1;
}

export const galleryRepository = {
  slugExists,
  create,
  findById,
  list,
  update,
  transaction,
  addImage,
  findImage,
  updateImage,
  deleteImage,
  nextImageOrder,
};
