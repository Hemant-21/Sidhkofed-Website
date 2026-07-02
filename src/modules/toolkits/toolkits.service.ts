/**
 * Toolkit service — business logic for the reusable Toolkit operation. CRUD + lifecycle, stable
 * slug, reference validation (programme non-archived + commodity active), cover media-usage
 * tracking (transactional), audit, and public-cache invalidation. Cross-module work goes through
 * services only (mediaService / mediaUsageService / auditService). Toolkit items and per-event
 * distributions are managed by their own services.
 */
import { NotFoundError, ValidationError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { assertEditableByActor } from '@/shared/content-guard';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { mediaService } from '@/modules/media/media.service';
import { mediaUsageService } from '@/modules/media/media-usage.service';
import { MEDIA_TYPE_REGISTRY } from '@/modules/media/media.validation';
import { toolkitRepository, type ToolkitRow } from './toolkits.repository';
import {
  toToolkitDetailDto,
  toToolkitSummaryDto,
  toPublicToolkitDetailDto,
  toPublicToolkitSummaryDto,
  type ToolkitDetailDto,
  type PublicToolkitDetailDto,
} from './toolkits.dto';
import { TOOLKIT_ENTITY, type ToolkitFilters, type ToolkitOrderingField } from './toolkits.types';
import { TOOLKIT_PERMISSIONS } from './toolkits.permissions';
import type { ToolkitCreateInput, ToolkitUpdateInput } from './toolkits.validators';

const COVER_FIELD = 'cover_media_id';
const PUBLIC_CACHE_PREFIX = 'toolkits:public';

function loaded(row: ToolkitRow | null): ToolkitRow {
  if (!row) throw new NotFoundError('Toolkit not found.');
  return row;
}
async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}
function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
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

async function assertReferencesValid(refs: Parameters<typeof toolkitRepository.validateReferences>[0]): Promise<void> {
  const errors = await toolkitRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: ToolkitCreateInput, ctx: AuditContext): Promise<ToolkitDetailDto> {
  const userId = requireUser(ctx);
  if (input.cover_media_id) await assertLinkableCover(input.cover_media_id);
  await assertReferencesValid({ programmeSchemeId: input.programme_scheme_id, commodityId: input.commodity_id });

  const slug = await uniqueSlug(input.title_en, toolkitRepository.slugExists);

  const toolkit = await toolkitRepository.transaction(async (tx) => {
    const created = await toolkitRepository.create(
      {
        titleEn: input.title_en,
        titleHi: input.title_hi ?? null,
        summaryEn: input.summary_en ?? null,
        summaryHi: input.summary_hi ?? null,
        descriptionEn: input.description_en ?? null,
        descriptionHi: input.description_hi ?? null,
        programmeSchemeId: input.programme_scheme_id ?? null,
        commodityId: input.commodity_id ?? null,
        coverMediaId: input.cover_media_id ?? null,
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
    if (input.cover_media_id) {
      await mediaUsageService.registerUsage(
        { mediaId: input.cover_media_id, entityType: TOOLKIT_ENTITY, entityId: created.id, field: COVER_FIELD },
        tx,
      );
    }
    return created;
  });

  await auditService.create(ctx, TOOLKIT_ENTITY, toolkit.id, { title_en: toolkit.titleEn, slug: toolkit.slug });
  await invalidatePublicCache();
  return toToolkitDetailDto(loaded(await toolkitRepository.findById(toolkit.id)));
}

// ── Update ──────────────────────────────────────────────────────────────────────
export async function update(id: string, input: ToolkitUpdateInput, ctx: AuditContext): Promise<ToolkitDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await toolkitRepository.findById(id));
  // Content Editors may edit drafts only; a published/archived toolkit requires a Publisher.
  assertEditableByActor(ctx.authz, existing.publicationState, TOOLKIT_PERMISSIONS.publish);

  const coverChanging = input.cover_media_id !== undefined && input.cover_media_id !== existing.coverMediaId;
  if (coverChanging && input.cover_media_id) await assertLinkableCover(input.cover_media_id);
  await assertReferencesValid({
    programmeSchemeId: input.programme_scheme_id,
    commodityId: input.commodity_id,
  });

  const updated = await toolkitRepository.transaction(async (tx) => {
    const row = await toolkitRepository.update(
      id,
      {
        titleEn: input.title_en,
        titleHi: input.title_hi,
        summaryEn: input.summary_en,
        summaryHi: input.summary_hi,
        descriptionEn: input.description_en,
        descriptionHi: input.description_hi,
        programmeSchemeId: input.programme_scheme_id,
        commodityId: input.commodity_id,
        coverMediaId: input.cover_media_id,
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
          { mediaId: existing.coverMediaId, entityType: TOOLKIT_ENTITY, entityId: id, field: COVER_FIELD },
          tx,
        );
      }
      if (input.cover_media_id) {
        await mediaUsageService.registerUsage(
          { mediaId: input.cover_media_id, entityType: TOOLKIT_ENTITY, entityId: id, field: COVER_FIELD },
          tx,
        );
      }
    }
    return row;
  });

  await auditService.update(ctx, TOOLKIT_ENTITY, id, undefined, { title_en: updated.titleEn });
  await invalidatePublicCache();
  return toToolkitDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<ToolkitDetailDto> {
  return toToolkitDetailDto(loaded(await toolkitRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: ToolkitFilters,
  ordering: { field: ToolkitOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toToolkitSummaryDto>>> {
  const { rows, total } = await toolkitRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toToolkitSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<ToolkitDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await toolkitRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await toolkitRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: TOOLKIT_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toToolkitDetailDto(updated);
}

/** Resolve a toolkit by id for sub-resources (items). Throws 404 when missing. */
export async function getRowById(id: string): Promise<ToolkitRow> {
  return loaded(await toolkitRepository.findById(id));
}

/**
 * Assert a toolkit is linkable from a per-event distribution (exists and not archived). Throws a
 * `toolkit_id`-keyed ValidationError otherwise. Used by the events toolkit-distributions service.
 */
export async function assertLinkable(toolkitId: string): Promise<void> {
  const row = await toolkitRepository.findById(toolkitId);
  if (!row) throw new ValidationError({ toolkit_id: ['Toolkit not found.'] });
  if (row.archivedAt) throw new ValidationError({ toolkit_id: ['Cannot link an archived toolkit.'] });
}

// ── Public reads ─────────────────────────────────────────────────────────────
export async function publicList(
  filters: ToolkitFilters,
  ordering: { field: ToolkitOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicToolkitSummaryDto>>> {
  const cached = await cacheService.getJson<ListResult<ReturnType<typeof toPublicToolkitSummaryDto>>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await toolkitRepository.list(filters, page.skip, page.take, { public: true, ordering });
  const result = { items: rows.map(toPublicToolkitSummaryDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export async function publicDetailBySlug(slug: string): Promise<PublicToolkitDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicToolkitDetailDto>(cacheKey);
  if (cached) return cached;
  const row = await toolkitRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('Toolkit not found.');
  const dto = toPublicToolkitDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

/** Resolve a published, publicly-visible toolkit by slug (for the distribution-summary endpoint). */
export async function publicRowBySlug(slug: string): Promise<ToolkitRow> {
  const row = await toolkitRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('Toolkit not found.');
  return row;
}

export const toolkitService = {
  create,
  update,
  getById,
  getRowById,
  assertLinkable,
  list,
  lifecycle,
  publicList,
  publicDetailBySlug,
  publicRowBySlug,
};
