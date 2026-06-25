/**
 * Video service (TASK 8) — YouTube-only videos. Validates/normalizes YouTube URLs,
 * enforces the ≤3 featured-homepage cap at publish time, and tracks thumbnail media
 * usage. No file hosting.
 */
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { settingsService } from '@/modules/settings/settings.service';
import { mediaService } from '@/modules/media/media.service';
import { mediaUsageService } from '@/modules/media/media-usage.service';
import { videoRepository } from './video.repository';
import { parseYouTubeUrl } from './youtube';
import { toVideoDto, type VideoDto } from './video.dto';
import type { VideoCreateInput, VideoUpdateInput } from './video.validators';

const ENTITY = 'video';

async function assertLinkableMedia(mediaId: string): Promise<void> {
  const media = await mediaService.getById(mediaId);
  if (media.archived_at) throw new ValidationError({ thumbnail_media_id: ['Cannot link an archived media asset.'] });
}

function parseUrlOrThrow(raw: string): { youtubeId: string; canonicalUrl: string } {
  const parsed = parseYouTubeUrl(raw);
  if (!parsed) throw new ValidationError({ youtube_url: ['Enter a valid YouTube URL.'] });
  return parsed;
}

/** Enforce the homepage cap (default 3) for currently-public featured videos. */
async function assertHomepageCap(excludeId?: string): Promise<void> {
  const limit = await settingsService.getVideoHomepageLimit();
  const current = await videoRepository.countPublicHomepage(excludeId);
  if (current >= limit) {
    throw new ConflictError(`At most ${limit} featured homepage videos may be published at once.`);
  }
}

export async function create(input: VideoCreateInput, ctx: AuditContext): Promise<VideoDto> {
  const { youtubeId, canonicalUrl } = parseUrlOrThrow(input.youtube_url);
  if (input.thumbnail_media_id) await assertLinkableMedia(input.thumbnail_media_id);
  const slug = await uniqueSlug(input.title_en, videoRepository.slugExists);
  const userId = ctx.userId ?? null;

  // Create the video and register its thumbnail-media usage atomically (Issue 6).
  const video = await videoRepository.transaction(async (tx) => {
    const created = await videoRepository.create(
      {
        titleEn: input.title_en,
        titleHi: input.title_hi ?? null,
        descriptionEn: input.description_en ?? null,
        descriptionHi: input.description_hi ?? null,
        youtubeId,
        youtubeUrl: canonicalUrl,
        thumbnailMediaId: input.thumbnail_media_id ?? null,
        slug,
        publicVisibility: input.public_visibility ?? true,
        showOnHomepage: input.show_on_homepage ?? false,
        displayOrder: input.display_order ?? null,
        createdById: userId,
        updatedById: userId,
      },
      tx,
    );
    if (input.thumbnail_media_id) {
      await mediaUsageService.registerUsage(
        { mediaId: input.thumbnail_media_id, entityType: ENTITY, entityId: created.id, field: 'thumbnail_media_id' },
        tx,
      );
    }
    return created;
  });

  await auditService.create(ctx, ENTITY, video.id, { title_en: video.titleEn, youtube_id: youtubeId });
  return toVideoDto(video);
}

export async function list(filters: { publicationState?: 'draft' | 'published' | 'unpublished' | 'archived'; showOnHomepage?: boolean; search?: string }, skip: number, take: number) {
  const { rows, total } = await videoRepository.list(filters, skip, take, 'desc');
  return { items: rows.map(toVideoDto), total };
}

export async function getById(id: string): Promise<VideoDto> {
  const v = await videoRepository.findById(id);
  if (!v) throw new NotFoundError('Video not found.');
  return toVideoDto(v);
}

export async function update(id: string, input: VideoUpdateInput, ctx: AuditContext): Promise<VideoDto> {
  const existing = await videoRepository.findById(id);
  if (!existing) throw new NotFoundError('Video not found.');

  const data: Record<string, unknown> = {
    titleEn: input.title_en,
    titleHi: input.title_hi,
    descriptionEn: input.description_en,
    descriptionHi: input.description_hi,
    publicVisibility: input.public_visibility,
    showOnHomepage: input.show_on_homepage,
    displayOrder: input.display_order,
    updatedById: ctx.userId ?? null,
  };

  if (input.youtube_url !== undefined) {
    const parsed = parseUrlOrThrow(input.youtube_url);
    data.youtubeId = parsed.youtubeId;
    data.youtubeUrl = parsed.canonicalUrl;
  }

  // Featuring an already-published video on the homepage must respect the cap.
  const turningOnHomepage = input.show_on_homepage === true && !existing.showOnHomepage;
  if (turningOnHomepage && existing.publicationState === 'published') {
    await assertHomepageCap(id);
  }

  const thumbChanging = input.thumbnail_media_id !== undefined && input.thumbnail_media_id !== existing.thumbnailMediaId;
  if (thumbChanging && input.thumbnail_media_id) await assertLinkableMedia(input.thumbnail_media_id);
  if (input.thumbnail_media_id !== undefined) data.thumbnailMediaId = input.thumbnail_media_id;

  // Update the row and re-point thumbnail-media usage atomically (Issue 6).
  const updated = await videoRepository.transaction(async (tx) => {
    const row = await videoRepository.update(id, data, tx);
    if (thumbChanging) {
      if (existing.thumbnailMediaId) {
        await mediaUsageService.removeUsage({ mediaId: existing.thumbnailMediaId, entityType: ENTITY, entityId: id, field: 'thumbnail_media_id' }, tx);
      }
      if (input.thumbnail_media_id) {
        await mediaUsageService.registerUsage({ mediaId: input.thumbnail_media_id, entityType: ENTITY, entityId: id, field: 'thumbnail_media_id' }, tx);
      }
    }
    return row;
  });
  await auditService.update(ctx, ENTITY, id, undefined, { title_en: updated.titleEn });
  return toVideoDto(updated);
}

export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<VideoDto> {
  const existing = await videoRepository.findById(id);
  if (!existing) throw new NotFoundError('Video not found.');

  if (action === 'publish' && existing.showOnHomepage) {
    await assertHomepageCap(id);
  }
  const change = applyLifecycle(
    { publicationState: existing.publicationState as 'draft', publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await videoRepository.update(id, { ...change, updatedById: ctx.userId ?? null });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  return toVideoDto(updated);
}

export const videoService = { create, list, getById, update, lifecycle };
