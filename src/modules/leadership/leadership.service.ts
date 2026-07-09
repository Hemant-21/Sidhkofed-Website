/**
 * Leadership service — all business logic for the Leadership operation. No HTTP, no Prisma here
 * (repository owns Prisma; controllers own HTTP). Owns: CRUD + lifecycle, stable slug generation,
 * photo media-usage tracking (so a linked photo cannot be hard-deleted), audit logging, and Redis
 * cache invalidation of public reads.
 *
 * Cross-module dependencies go through SERVICES only (mediaService / mediaUsageService /
 * auditService) — never another module's repository (dependency-graph cross-module rule).
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
import { leadershipRepository, type LeadershipRow } from './leadership.repository';
import {
  toLeadershipDetailDto,
  toLeadershipSummaryDto,
  toPublicLeadershipDto,
  type LeadershipDetailDto,
} from './leadership.dto';
import { LEADERSHIP_ENTITY, type LeadershipFilters, type LeadershipOrderingField } from './leadership.types';
import { LEADERSHIP_PERMISSIONS, LEADERSHIP_PERMISSION_TO_CONTENT } from './leadership.permissions';
import type { LeadershipCreateInput, LeadershipUpdateInput } from './leadership.validators';

const PHOTO_FIELD = 'photo_media_id';
const PUBLIC_CACHE_PREFIX = 'leadership:public';
const PUBLISH_PERMISSION =
  LEADERSHIP_PERMISSION_TO_CONTENT[LEADERSHIP_PERMISSIONS.publish] ?? 'content.publish';

function loaded(row: LeadershipRow | null): LeadershipRow {
  if (!row) throw new NotFoundError('Leadership entry not found.');
  return row;
}

async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

/** Validate a media asset is linkable as a photo (exists, not archived, image category). */
async function assertLinkablePhoto(mediaId: string): Promise<void> {
  let media: Awaited<ReturnType<typeof mediaService.getById>>;
  try {
    media = await mediaService.getById(mediaId);
  } catch {
    throw new ValidationError({ [PHOTO_FIELD]: ['Media asset not found.'] });
  }
  if (media.archived_at) throw new ValidationError({ [PHOTO_FIELD]: ['Cannot link an archived media asset.'] });
  const def = MEDIA_TYPE_REGISTRY[media.mime_type];
  if (!def || def.category !== 'image') {
    throw new ValidationError({ [PHOTO_FIELD]: ['Photo must be an image.'] });
  }
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: LeadershipCreateInput, ctx: AuditContext): Promise<LeadershipDetailDto> {
  const userId = requireUser(ctx);
  if (input.photo_media_id) await assertLinkablePhoto(input.photo_media_id);

  const slug = await uniqueSlug(input.name_en, leadershipRepository.slugExists);

  const entry = await leadershipRepository.transaction(async (tx) => {
    const created = await leadershipRepository.create(
      {
        nameEn: input.name_en,
        nameHi: input.name_hi ?? null,
        govtRoleEn: input.govt_role_en,
        govtRoleHi: input.govt_role_hi ?? null,
        sidhkofedRoleEn: input.sidhkofed_role_en,
        sidhkofedRoleHi: input.sidhkofed_role_hi ?? null,
        photoMediaId: input.photo_media_id ?? null,
        slug,
        publicVisibility: input.public_visibility ?? true,
        publishStartAt: input.publish_start_at ?? null,
        highlightType: input.highlight_type ?? null,
        highlightStartAt: input.highlight_start_at ?? null,
        highlightEndAt: input.highlight_end_at ?? null,
        displayOrder: input.display_order ?? null,
        createdById: userId,
        updatedById: userId,
      },
      tx,
    );
    if (input.photo_media_id) {
      await mediaUsageService.registerUsage(
        { mediaId: input.photo_media_id, entityType: LEADERSHIP_ENTITY, entityId: created.id, field: PHOTO_FIELD },
        tx,
      );
    }
    return created;
  });

  await auditService.create(ctx, LEADERSHIP_ENTITY, entry.id, { name_en: entry.nameEn, slug: entry.slug });
  await invalidatePublicCache();
  return toLeadershipDetailDto(loaded(await leadershipRepository.findById(entry.id)));
}

// ── Update (PATCH — partial; never transitions publication state, never changes slug) ──
export async function update(
  id: string,
  input: LeadershipUpdateInput,
  ctx: AuditContext,
): Promise<LeadershipDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await leadershipRepository.findById(id));
  assertEditableByActor(ctx.authz, existing.publicationState, PUBLISH_PERMISSION);

  const photoChanging = input.photo_media_id !== undefined && input.photo_media_id !== existing.photoMediaId;
  if (photoChanging && input.photo_media_id) await assertLinkablePhoto(input.photo_media_id);

  const updated = await leadershipRepository.transaction(async (tx) => {
    const row = await leadershipRepository.update(
      id,
      {
        nameEn: input.name_en,
        nameHi: input.name_hi,
        govtRoleEn: input.govt_role_en,
        govtRoleHi: input.govt_role_hi,
        sidhkofedRoleEn: input.sidhkofed_role_en,
        sidhkofedRoleHi: input.sidhkofed_role_hi,
        photoMediaId: input.photo_media_id,
        publicVisibility: input.public_visibility,
        publishStartAt: input.publish_start_at,
        highlightType: input.highlight_type,
        highlightStartAt: input.highlight_start_at,
        highlightEndAt: input.highlight_end_at,
        displayOrder: input.display_order,
        updatedById: userId,
      },
      tx,
    );
    if (photoChanging) {
      if (existing.photoMediaId) {
        await mediaUsageService.removeUsage(
          { mediaId: existing.photoMediaId, entityType: LEADERSHIP_ENTITY, entityId: id, field: PHOTO_FIELD },
          tx,
        );
      }
      if (input.photo_media_id) {
        await mediaUsageService.registerUsage(
          { mediaId: input.photo_media_id, entityType: LEADERSHIP_ENTITY, entityId: id, field: PHOTO_FIELD },
          tx,
        );
      }
    }
    return row;
  });

  await auditService.update(ctx, LEADERSHIP_ENTITY, id, undefined, { name_en: updated.nameEn });
  await invalidatePublicCache();
  return toLeadershipDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<LeadershipDetailDto> {
  return toLeadershipDetailDto(loaded(await leadershipRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: LeadershipFilters,
  ordering: { field: LeadershipOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toLeadershipSummaryDto>>> {
  const { rows, total } = await leadershipRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toLeadershipSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(
  id: string,
  action: LifecycleAction,
  ctx: AuditContext,
): Promise<LeadershipDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await leadershipRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await leadershipRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: LEADERSHIP_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toLeadershipDetailDto(updated);
}

// ── Public reads (visibility predicate + Redis cache) ──────────────────────────
export async function publicList(
  filters: LeadershipFilters,
  ordering: { field: LeadershipOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicLeadershipDto>>> {
  const cached = await cacheService.getJson<ListResult<ReturnType<typeof toPublicLeadershipDto>>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await leadershipRepository.list(filters, page.skip, page.take, { public: true, ordering });
  const result = { items: rows.map(toPublicLeadershipDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export const leadershipService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  publicList,
};
