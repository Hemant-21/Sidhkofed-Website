/**
 * Event News service. News is DERIVED from a completed event (CMS requirements §4.1 / API spec §6):
 *   - publishFromEvent: requires a completed event + publisher permission; creates ONE event_news
 *     record with its OWN slug/lifecycle, prefilled from the event but overridable. Never mutates
 *     the source event.
 *   - update / lifecycle: manage the derived record (its own publish/unpublish/archive/restore).
 *   - "Remove from News" maps to the standard `archive` lifecycle (hidden publicly, restorable).
 *
 * Cross-module: reads the source event through eventService (a service call, never its repository).
 */
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { mediaService } from '@/modules/media/media.service';
import { mediaUsageService } from '@/modules/media/media-usage.service';
import { MEDIA_TYPE_REGISTRY } from '@/modules/media/media.validation';
import { eventService } from '../events.service';
import { newsRepository, type NewsRow } from './news.repository';
import {
  toNewsDetailDto,
  toNewsSummaryDto,
  toPublicNewsDetailDto,
  toPublicNewsSummaryDto,
  type NewsDetailDto,
  type PublicNewsDetailDto,
} from './news.dto';
import { NEWS_ENTITY, type NewsFilters, type NewsOrderingField } from './news.types';
import type { PublishAsNewsInput, NewsUpdateInput } from './news.validators';

const COVER_FIELD = 'cover_media_id';
const PUBLIC_CACHE_PREFIX = 'news:public';

function loaded(row: NewsRow | null): NewsRow {
  if (!row) throw new NotFoundError('News item not found.');
  return row;
}
async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}
function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

/** True when `err` is a Prisma P2002 unique violation on a constraint covering `field`. */
function isUniqueViolation(err: unknown, field: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: string; meta?: { target?: unknown } };
  if (e.code !== 'P2002') return false;
  const target = e.meta?.target;
  const cols = Array.isArray(target) ? target.map(String) : typeof target === 'string' ? [target] : [];
  return cols.length === 0 || cols.some((c) => c.includes(field));
}

async function assertLinkableCover(mediaId: string): Promise<void> {
  let media: Awaited<ReturnType<typeof mediaService.getById>>;
  try {
    media = await mediaService.getById(mediaId);
  } catch {
    throw new ValidationError({ [COVER_FIELD]: ['Media asset not found.'] });
  }
  if (media.archived_at) throw new ValidationError({ [COVER_FIELD]: ['Cannot link an archived media asset.'] });
  const def = MEDIA_TYPE_REGISTRY[media.mime_type];
  if (!def || def.category !== 'image') throw new ValidationError({ [COVER_FIELD]: ['Cover must be an image.'] });
}

// ── Publish an event as news (POST /admin/events/{id}/publish-as-news) ─────────
export async function publishFromEvent(eventId: string, input: PublishAsNewsInput, ctx: AuditContext): Promise<NewsDetailDto> {
  const userId = requireUser(ctx);
  // Source event must exist and be completed (only completed events become news, §4.1).
  const event = await eventService.getById(eventId); // throws NotFound if missing
  if (event.event_status !== 'completed') {
    throw new ConflictError('Only a completed event can be published as news.');
  }

  // Duplicate-news guard (Issue 3): an event may be published as news at most once. The service
  // check catches the common case early; the unique constraint on event_news.event_id is the
  // race-safe backstop — a P2002 from a concurrent request is mapped to the same 409 below.
  if (await newsRepository.existsForEvent(eventId)) {
    throw new ConflictError('This event has already been published as news.');
  }

  const coverMediaId = input.cover_media_id !== undefined ? input.cover_media_id : event.cover_media?.id ?? null;
  if (coverMediaId) await assertLinkableCover(coverMediaId);

  const titleEn = input.title_en ?? event.title_en;
  const slug = await uniqueSlug(titleEn, newsRepository.slugExists);

  let news: NewsRow;
  try {
    news = await newsRepository.transaction(async (tx) => {
      const created = await newsRepository.create(
        {
          eventId,
          titleEn,
          titleHi: input.title_hi ?? event.title_hi,
          summaryEn: input.summary_en ?? event.summary_en,
          summaryHi: input.summary_hi ?? event.summary_hi,
          bodyEn: input.body_en ?? event.description_en,
          bodyHi: input.body_hi ?? event.description_hi,
          coverMediaId,
          newsPublishedAt: input.news_published_at ?? null,
          slug,
          publicVisibility: input.public_visibility ?? true,
          publishStartAt: input.publish_start_at ?? null,
          highlightType: input.highlight_type ?? null,
          highlightStartAt: input.highlight_start_at ?? null,
          highlightEndAt: input.highlight_end_at ?? null,
          displayOrder: input.display_order ?? null,
          showOnHomepage: input.show_on_homepage ?? false,
          createdById: userId,
          updatedById: userId,
        },
        tx,
      );
      if (coverMediaId) {
        await mediaUsageService.registerUsage(
          { mediaId: coverMediaId, entityType: NEWS_ENTITY, entityId: created.id, field: COVER_FIELD },
          tx,
        );
      }
      return created;
    });
  } catch (err) {
    // Race condition: a concurrent publish won the unique event_id constraint first.
    if (isUniqueViolation(err, 'event_id')) {
      throw new ConflictError('This event has already been published as news.');
    }
    throw err;
  }

  await auditService.create(ctx, NEWS_ENTITY, news.id, { event_id: eventId, slug: news.slug, summary: 'NEWS_PUBLISH' });
  await invalidatePublicCache();
  return toNewsDetailDto(loaded(await newsRepository.findById(news.id)));
}

// ── Update (PATCH — never changes the source event link or publication state) ──
export async function update(id: string, input: NewsUpdateInput, ctx: AuditContext): Promise<NewsDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await newsRepository.findById(id));
  const coverChanging = input.cover_media_id !== undefined && input.cover_media_id !== existing.coverMediaId;
  if (coverChanging && input.cover_media_id) await assertLinkableCover(input.cover_media_id);

  const updated = await newsRepository.transaction(async (tx) => {
    const row = await newsRepository.update(
      id,
      {
        titleEn: input.title_en,
        titleHi: input.title_hi,
        summaryEn: input.summary_en,
        summaryHi: input.summary_hi,
        bodyEn: input.body_en,
        bodyHi: input.body_hi,
        coverMediaId: input.cover_media_id,
        newsPublishedAt: input.news_published_at,
        publicVisibility: input.public_visibility,
        publishStartAt: input.publish_start_at,
        highlightType: input.highlight_type,
        highlightStartAt: input.highlight_start_at,
        highlightEndAt: input.highlight_end_at,
        displayOrder: input.display_order,
        showOnHomepage: input.show_on_homepage,
        updatedById: userId,
      },
      tx,
    );
    if (coverChanging) {
      if (existing.coverMediaId) {
        await mediaUsageService.removeUsage(
          { mediaId: existing.coverMediaId, entityType: NEWS_ENTITY, entityId: id, field: COVER_FIELD },
          tx,
        );
      }
      if (input.cover_media_id) {
        await mediaUsageService.registerUsage(
          { mediaId: input.cover_media_id, entityType: NEWS_ENTITY, entityId: id, field: COVER_FIELD },
          tx,
        );
      }
    }
    return row;
  });

  await auditService.update(ctx, NEWS_ENTITY, id, undefined, { title_en: updated.titleEn });
  await invalidatePublicCache();
  return toNewsDetailDto(updated);
}

export async function getById(id: string): Promise<NewsDetailDto> {
  return toNewsDetailDto(loaded(await newsRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: NewsFilters,
  ordering: { field: NewsOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toNewsSummaryDto>>> {
  const { rows, total } = await newsRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toNewsSummaryDto), total };
}

export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<NewsDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await newsRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  // On first publish with no explicit news date, stamp the news publish date.
  const extra = action === 'publish' && !existing.newsPublishedAt ? { newsPublishedAt: new Date() } : {};
  const updated = await newsRepository.update(id, { ...change, ...extra, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: NEWS_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toNewsDetailDto(updated);
}

export async function publicList(
  filters: NewsFilters,
  ordering: { field: NewsOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicNewsSummaryDto>>> {
  const cached = await cacheService.getJson<ListResult<ReturnType<typeof toPublicNewsSummaryDto>>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await newsRepository.list(filters, page.skip, page.take, { public: true, ordering });
  const result = { items: rows.map(toPublicNewsSummaryDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export async function publicDetailBySlug(slug: string): Promise<PublicNewsDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicNewsDetailDto>(cacheKey);
  if (cached) return cached;
  const row = await newsRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('News item not found.');
  const dto = toPublicNewsDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const newsService = {
  publishFromEvent,
  update,
  getById,
  list,
  lifecycle,
  publicList,
  publicDetailBySlug,
};
