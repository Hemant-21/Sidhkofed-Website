/**
 * Media repository — the only Prisma caller for the media module.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';

export interface MediaCreateInput {
  /** Optional explicit primary key — lets the service build a stable delivery URL pre-insert. */
  id?: string;
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  title: string | null;
  altText: string | null;
  caption: string | null;
  checksum: string | null;
  uploadedById: string | null;
}

export interface MediaListFilters {
  mimeType?: string;
  archived?: boolean;
  search?: string;
  /** Filter to assets used by this entity type (e.g. `gallery`). */
  usedBy?: string;
}

export async function create(data: MediaCreateInput) {
  return prisma.mediaAsset.create({
    data: { ...data, fileSizeBytes: BigInt(data.fileSizeBytes) },
  });
}

export async function findById(id: string) {
  return prisma.mediaAsset.findUnique({ where: { id } });
}

export async function findByChecksum(checksum: string) {
  return prisma.mediaAsset.findFirst({ where: { checksum, archivedAt: null } });
}

function buildWhere(f: MediaListFilters): Prisma.MediaAssetWhereInput {
  const where: Prisma.MediaAssetWhereInput = {};
  if (f.mimeType) where.mimeType = f.mimeType;
  if (f.archived === true) where.archivedAt = { not: null };
  if (f.archived === false) where.archivedAt = null;
  if (f.usedBy) where.usages = { some: { entityType: f.usedBy } };
  if (f.search) {
    where.OR = [
      { fileName: { contains: f.search, mode: 'insensitive' } },
      { title: { contains: f.search, mode: 'insensitive' } },
      { altText: { contains: f.search, mode: 'insensitive' } },
      { caption: { contains: f.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function list(filters: MediaListFilters, skip: number, take: number, direction: 'asc' | 'desc') {
  const where = buildWhere(filters);
  const [rows, total] = await Promise.all([
    prisma.mediaAsset.findMany({ where, orderBy: { createdAt: direction }, skip, take }),
    prisma.mediaAsset.count({ where }),
  ]);
  return { rows, total };
}

export async function updateMeta(
  id: string,
  data: { title?: string | null; altText?: string | null; caption?: string | null },
) {
  return prisma.mediaAsset.update({ where: { id }, data });
}

export async function setArchived(id: string, archivedAt: Date | null) {
  return prisma.mediaAsset.update({ where: { id }, data: { archivedAt } });
}

export async function setReplacedBy(oldId: string, newId: string) {
  return prisma.mediaAsset.update({ where: { id: oldId }, data: { replacedById: newId } });
}

/**
 * Public-visibility check for media delivery (remediation — scheduled-publishing gate). An
 * asset may be served publicly only when it is referenced by at least one PUBLIC parent: a
 * published Document (file), Gallery (cover or image), Video (thumbnail), Event cover, News
 * cover, or Institution logo, or an active commodity icon (commodities are public reference
 * masters). Otherwise the public media endpoint returns 403.
 *
 * The parent predicate is the SINGLE shared `publicVisibilityWhere()` used by every content
 * read path — so it now ALSO honours `publish_start_at` (a future-scheduled parent no longer
 * exposes its media early). Event and News cover media are included here (Issue 2) so the public
 * event/news endpoints never emit a cover URL that the media endpoint would later 403. Published
 * Institution logos are included (Phase 8 remediation Issue 1) so homepage/partner logos surfaced
 * by the public Institution DTOs are actually downloadable. Published Digital Service icons are
 * included (Phase 10 remediation Issue 1) so the public `/digital-services` icons are downloadable.
 * Read-only cross-table check kept here (the media repository is the Prisma caller for media delivery).
 */
export async function isPubliclyLinked(mediaId: string): Promise<boolean> {
  const parent = publicVisibilityWhere(); // published + public + not archived + publish window due
  const documentParent = publicVisibilityWhere({ requireIsPublic: true });
  const [doc, galleryCover, galleryImage, video, eventCover, newsCover, institutionLogo, commodityIcon, serviceIcon] =
    await Promise.all([
      prisma.document.count({ where: { fileAssetId: mediaId, ...documentParent } as Prisma.DocumentWhereInput }),
      prisma.gallery.count({ where: { coverMediaId: mediaId, ...parent } as Prisma.GalleryWhereInput }),
      prisma.galleryImage.count({ where: { mediaId, gallery: { is: parent as Prisma.GalleryWhereInput } } }),
      prisma.video.count({ where: { thumbnailMediaId: mediaId, ...parent } as Prisma.VideoWhereInput }),
      prisma.event.count({ where: { coverMediaId: mediaId, ...parent } as Prisma.EventWhereInput }),
      prisma.eventNews.count({ where: { coverMediaId: mediaId, ...parent } as Prisma.EventNewsWhereInput }),
      prisma.institution.count({ where: { logoMediaId: mediaId, ...parent } as Prisma.InstitutionWhereInput }),
      prisma.commodity.count({ where: { iconMediaId: mediaId, isActive: true } }),
      prisma.digitalService.count({ where: { iconMediaId: mediaId, ...parent } as Prisma.DigitalServiceWhereInput }),
    ]);
  return (
    doc + galleryCover + galleryImage + video + eventCover + newsCover + institutionLogo + commodityIcon + serviceIcon >
    0
  );
}

export type MediaRow = Prisma.PromiseReturnType<typeof findById>;

export const mediaRepository = {
  create,
  findById,
  findByChecksum,
  list,
  updateMeta,
  setArchived,
  setReplacedBy,
  isPubliclyLinked,
};
