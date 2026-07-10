/**
 * Gallery service (TASK 7) — CRUD, image ordering, cover image, and lifecycle, with
 * transactional media-usage tracking so linked media cannot be hard-deleted. Cross-module
 * dependencies go through the media SERVICE (never its repository).
 */
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { cacheService } from '@/services/cache';
import { mediaService } from '@/modules/media/media.service';
import { mediaUsageService } from '@/modules/media/media-usage.service';
import {
  galleryRepository,
  type GalleryRow,
  type GallerySummaryRow,
  type GalleryOrderingField,
  type GalleryPublicListFilters,
} from './gallery.repository';
import {
  toGalleryDto,
  toGalleryListItemDto,
  toPublicGallerySummaryDto,
  toPublicGalleryDetailDto,
  type GalleryDto,
  type PublicGallerySummaryDto,
  type PublicGalleryDetailDto,
} from './gallery.dto';
import type { GalleryCreateInput, GalleryUpdateInput, GalleryImageInput, GalleryImageUpdateInput, ReorderInput } from './gallery.validators';

const ENTITY = 'gallery';
const PUBLIC_CACHE_PREFIX = 'galleries:public';

/** Invalidate every cached public gallery response after any admin write. */
async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}

/** Ensure a media asset exists and is not archived before linking it. */
async function assertLinkableMedia(mediaId: string): Promise<void> {
  const media = await mediaService.getById(mediaId); // throws NotFound if missing
  if (media.archived_at) {
    throw new ValidationError({ media_id: ['Cannot link an archived media asset.'] });
  }
}

function loaded(row: GalleryRow | null): GalleryRow {
  if (!row) throw new NotFoundError('Gallery not found.');
  return row;
}

async function toAdminGalleryListItemDto(row: GallerySummaryRow) {
  const dto = toGalleryListItemDto(row);
  if (row.coverMedia) dto.cover_media = await mediaService.toAdminMediaDto(row.coverMedia);
  return dto;
}

async function toAdminGalleryDto(row: GalleryRow): Promise<GalleryDto> {
  const dto = toGalleryDto(row);
  if (row.coverMedia) dto.cover_media = await mediaService.toAdminMediaDto(row.coverMedia);
  dto.images = await Promise.all(
    row.images.map(async (img) => ({
      id: img.id,
      media: await mediaService.toAdminMediaDto(img.media),
      display_order: img.displayOrder,
      caption_en: img.captionEn,
      caption_hi: img.captionHi,
    })),
  );
  return dto;
}

export async function create(input: GalleryCreateInput, ctx: AuditContext): Promise<GalleryDto> {
  if (input.cover_media_id) await assertLinkableMedia(input.cover_media_id);
  const slug = await uniqueSlug(input.title_en, galleryRepository.slugExists);
  const userId = ctx.userId ?? null;

  // Create the gallery and register its cover-media usage atomically (Issue 6) — no
  // gallery may exist without its usage row, and vice versa.
  const gallery = await galleryRepository.transaction(async (tx) => {
    const created = await galleryRepository.create(
      {
        titleEn: input.title_en,
        titleHi: input.title_hi ?? null,
        descriptionEn: input.description_en ?? null,
        descriptionHi: input.description_hi ?? null,
        coverMediaId: input.cover_media_id ?? null,
        slug,
        publicVisibility: input.public_visibility ?? true,
        showOnHomepage: input.show_on_homepage ?? false,
        displayOrder: input.display_order ?? null,
        createdById: userId,
        updatedById: userId,
      },
      tx,
    );
    if (input.cover_media_id) {
      await mediaUsageService.registerUsage(
        { mediaId: input.cover_media_id, entityType: ENTITY, entityId: created.id, field: 'cover_media_id' },
        tx,
      );
    }
    return created;
  });

  await auditService.create(ctx, ENTITY, gallery.id, { title_en: gallery.titleEn, slug: gallery.slug });
  await invalidatePublicCache();
  return toAdminGalleryDto(gallery);
}

export async function list(filters: { publicationState?: 'draft' | 'published' | 'unpublished' | 'archived'; search?: string }, skip: number, take: number) {
  // List returns the lightweight summary (cover + image count) — not every image (Issue 11).
  const { rows, total } = await galleryRepository.list(filters, skip, take, 'desc');
  return { items: await Promise.all(rows.map(toAdminGalleryListItemDto)), total };
}

export async function getById(id: string): Promise<GalleryDto> {
  return toAdminGalleryDto(loaded(await galleryRepository.findById(id)));
}

export async function update(id: string, input: GalleryUpdateInput, ctx: AuditContext): Promise<GalleryDto> {
  const existing = loaded(await galleryRepository.findById(id));

  // Cover change → re-point media usage.
  const coverChanging = input.cover_media_id !== undefined && input.cover_media_id !== existing.coverMediaId;
  if (coverChanging && input.cover_media_id) await assertLinkableMedia(input.cover_media_id);

  // Update the row and re-point cover-media usage atomically (Issue 6).
  const updated = await galleryRepository.transaction(async (tx) => {
    const row = await galleryRepository.update(
      id,
      {
        titleEn: input.title_en,
        titleHi: input.title_hi,
        descriptionEn: input.description_en,
        descriptionHi: input.description_hi,
        coverMediaId: input.cover_media_id,
        publicVisibility: input.public_visibility,
        showOnHomepage: input.show_on_homepage,
        displayOrder: input.display_order,
        updatedById: ctx.userId ?? null,
      },
      tx,
    );
    if (coverChanging) {
      if (existing.coverMediaId) {
        await mediaUsageService.removeUsage({ mediaId: existing.coverMediaId, entityType: ENTITY, entityId: id, field: 'cover_media_id' }, tx);
      }
      if (input.cover_media_id) {
        await mediaUsageService.registerUsage({ mediaId: input.cover_media_id, entityType: ENTITY, entityId: id, field: 'cover_media_id' }, tx);
      }
    }
    return row;
  });

  await auditService.update(ctx, ENTITY, id, undefined, { title_en: updated.titleEn });
  await invalidatePublicCache();
  return toAdminGalleryDto(updated);
}

export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<GalleryDto> {
  const existing = loaded(await galleryRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState as 'draft', publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await galleryRepository.update(id, { ...change, updatedById: ctx.userId ?? null });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toAdminGalleryDto(updated);
}

// ── Images ────────────────────────────────────────────────────────────────────
export async function addImage(galleryId: string, input: GalleryImageInput, ctx: AuditContext): Promise<GalleryDto> {
  loaded(await galleryRepository.findById(galleryId));
  await assertLinkableMedia(input.media_id);

  const order = input.display_order ?? (await galleryRepository.nextImageOrder(galleryId));
  try {
    await galleryRepository.transaction(async (tx) => {
      await galleryRepository.addImage(
        galleryId,
        { mediaId: input.media_id, displayOrder: order, captionEn: input.caption_en ?? null, captionHi: input.caption_hi ?? null },
        tx,
      );
      await mediaUsageService.registerUsage({ mediaId: input.media_id, entityType: ENTITY, entityId: galleryId, field: 'image' }, tx);
    });
  } catch (err) {
    if (typeof err === 'object' && err && (err as { code?: string }).code === 'P2002') {
      throw new ConflictError('This media is already in the gallery.');
    }
    throw err;
  }
  await auditService.update(ctx, ENTITY, galleryId, undefined, { added_image: input.media_id });
  await invalidatePublicCache();
  return getById(galleryId);
}

export async function updateImage(galleryId: string, imageId: string, input: GalleryImageUpdateInput, ctx: AuditContext): Promise<GalleryDto> {
  loaded(await galleryRepository.findById(galleryId));
  const image = await galleryRepository.findImage(galleryId, imageId);
  if (!image) throw new NotFoundError('Gallery image not found.');
  await galleryRepository.updateImage(imageId, {
    displayOrder: input.display_order,
    captionEn: input.caption_en,
    captionHi: input.caption_hi,
  });
  await auditService.update(ctx, ENTITY, galleryId, undefined, { updated_image: imageId });
  await invalidatePublicCache();
  return getById(galleryId);
}

export async function removeImage(galleryId: string, imageId: string, ctx: AuditContext): Promise<GalleryDto> {
  loaded(await galleryRepository.findById(galleryId));
  const image = await galleryRepository.findImage(galleryId, imageId);
  if (!image) throw new NotFoundError('Gallery image not found.');

  await galleryRepository.transaction(async (tx) => {
    await galleryRepository.deleteImage(imageId, tx);
    await mediaUsageService.removeUsage({ mediaId: image.mediaId, entityType: ENTITY, entityId: galleryId, field: 'image' }, tx);
  });
  await auditService.update(ctx, ENTITY, galleryId, { removed_image: image.mediaId }, undefined);
  await invalidatePublicCache();
  return getById(galleryId);
}

export async function reorderImages(galleryId: string, input: ReorderInput, ctx: AuditContext): Promise<GalleryDto> {
  loaded(await galleryRepository.findById(galleryId));
  await galleryRepository.transaction(async (tx) => {
    for (const item of input.order) {
      const image = await galleryRepository.findImage(galleryId, item.id, tx);
      if (!image) throw new ValidationError({ order: [`Image ${item.id} is not part of this gallery.`] });
      await galleryRepository.updateImage(item.id, { displayOrder: item.display_order }, tx);
    }
  });
  await auditService.update(ctx, ENTITY, galleryId, undefined, { reordered: input.order.length });
  await invalidatePublicCache();
  return getById(galleryId);
}

// ── Public reads (visibility predicate + Redis cache) ──────────────────────────
export interface PublicListResult<T> {
  items: T[];
  total: number;
}

export async function publicList(
  filters: GalleryPublicListFilters,
  ordering: { field: GalleryOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number },
  cacheKey: string,
): Promise<PublicListResult<PublicGallerySummaryDto>> {
  const cached = await cacheService.getJson<PublicListResult<PublicGallerySummaryDto>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await galleryRepository.publicList(filters, page.skip, page.take, ordering);
  const result = { items: rows.map(toPublicGallerySummaryDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export async function publicDetailBySlug(slug: string): Promise<PublicGalleryDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicGalleryDetailDto>(cacheKey);
  if (cached) return cached;
  const row = await galleryRepository.findPublicBySlug(slug);
  if (!row) throw new NotFoundError('Gallery not found.');
  const dto = toPublicGalleryDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const galleryService = {
  create,
  list,
  getById,
  publicList,
  publicDetailBySlug,
  update,
  lifecycle,
  addImage,
  updateImage,
  removeImage,
  reorderImages,
};
