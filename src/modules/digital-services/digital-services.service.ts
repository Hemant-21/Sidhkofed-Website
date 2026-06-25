/**
 * Digital Service service — all business logic for the Digital Service operation. No HTTP, no Prisma
 * here (repository owns Prisma; controllers own HTTP). Owns: CRUD + lifecycle, stable slug
 * generation, icon media-usage tracking (so a linked icon cannot be hard-deleted), audit logging,
 * and Redis cache invalidation of public reads.
 *
 * Key rules (CMS requirements §4.14): represents APPROVED external systems only (ERP, MIS,
 * membership, beneficiary/government portals). The CMS never simulates, proxies, or embeds them —
 * clients open `external_url` in a new tab with rel="noopener noreferrer".
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
import { digitalServiceRepository, type DigitalServiceRow } from './digital-services.repository';
import {
  toDigitalServiceDetailDto,
  toDigitalServiceSummaryDto,
  toPublicDigitalServiceDto,
  type DigitalServiceDetailDto,
} from './digital-services.dto';
import { DIGITAL_SERVICE_ENTITY, type DigitalServiceFilters, type DigitalServiceOrderingField } from './digital-services.types';
import { DIGITAL_SERVICE_PERMISSIONS, DIGITAL_SERVICE_PERMISSION_TO_CONTENT } from './digital-services.permissions';
import type { DigitalServiceCreateInput, DigitalServiceUpdateInput } from './digital-services.validators';

const ICON_FIELD = 'icon_media_id';
const PUBLIC_CACHE_PREFIX = 'digital-services:public';
const PUBLISH_PERMISSION =
  DIGITAL_SERVICE_PERMISSION_TO_CONTENT[DIGITAL_SERVICE_PERMISSIONS.publish] ?? 'content.publish';

function loaded(row: DigitalServiceRow | null): DigitalServiceRow {
  if (!row) throw new NotFoundError('Digital service not found.');
  return row;
}

async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

/** Validate a media asset is linkable as an image icon (exists, not archived, image category). */
async function assertLinkableIcon(mediaId: string): Promise<void> {
  let media: Awaited<ReturnType<typeof mediaService.getById>>;
  try {
    media = await mediaService.getById(mediaId);
  } catch {
    throw new ValidationError({ [ICON_FIELD]: ['Media asset not found.'] });
  }
  if (media.archived_at) throw new ValidationError({ [ICON_FIELD]: ['Cannot link an archived media asset.'] });
  const def = MEDIA_TYPE_REGISTRY[media.mime_type];
  if (!def || def.category !== 'image') {
    throw new ValidationError({ [ICON_FIELD]: ['Icon must be an image.'] });
  }
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: DigitalServiceCreateInput, ctx: AuditContext): Promise<DigitalServiceDetailDto> {
  const userId = requireUser(ctx);
  if (input.icon_media_id) await assertLinkableIcon(input.icon_media_id);

  const slug = await uniqueSlug(input.title_en, digitalServiceRepository.slugExists);

  const service = await digitalServiceRepository.transaction(async (tx) => {
    const created = await digitalServiceRepository.create(
      {
        titleEn: input.title_en,
        titleHi: input.title_hi ?? null,
        descriptionEn: input.description_en ?? null,
        descriptionHi: input.description_hi ?? null,
        externalUrl: input.external_url,
        iconMediaId: input.icon_media_id ?? null,
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
    if (input.icon_media_id) {
      await mediaUsageService.registerUsage(
        { mediaId: input.icon_media_id, entityType: DIGITAL_SERVICE_ENTITY, entityId: created.id, field: ICON_FIELD },
        tx,
      );
    }
    return created;
  });

  await auditService.create(ctx, DIGITAL_SERVICE_ENTITY, service.id, { title_en: service.titleEn, slug: service.slug });
  await invalidatePublicCache();
  return toDigitalServiceDetailDto(loaded(await digitalServiceRepository.findById(service.id)));
}

// ── Update (PATCH — partial; never transitions publication state, never changes slug) ──
export async function update(
  id: string,
  input: DigitalServiceUpdateInput,
  ctx: AuditContext,
): Promise<DigitalServiceDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await digitalServiceRepository.findById(id));
  assertEditableByActor(ctx.authz, existing.publicationState, PUBLISH_PERMISSION);

  const iconChanging = input.icon_media_id !== undefined && input.icon_media_id !== existing.iconMediaId;
  if (iconChanging && input.icon_media_id) await assertLinkableIcon(input.icon_media_id);

  const updated = await digitalServiceRepository.transaction(async (tx) => {
    const row = await digitalServiceRepository.update(
      id,
      {
        titleEn: input.title_en,
        titleHi: input.title_hi,
        descriptionEn: input.description_en,
        descriptionHi: input.description_hi,
        externalUrl: input.external_url,
        iconMediaId: input.icon_media_id,
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
    if (iconChanging) {
      if (existing.iconMediaId) {
        await mediaUsageService.removeUsage(
          { mediaId: existing.iconMediaId, entityType: DIGITAL_SERVICE_ENTITY, entityId: id, field: ICON_FIELD },
          tx,
        );
      }
      if (input.icon_media_id) {
        await mediaUsageService.registerUsage(
          { mediaId: input.icon_media_id, entityType: DIGITAL_SERVICE_ENTITY, entityId: id, field: ICON_FIELD },
          tx,
        );
      }
    }
    return row;
  });

  await auditService.update(ctx, DIGITAL_SERVICE_ENTITY, id, undefined, { title_en: updated.titleEn });
  await invalidatePublicCache();
  return toDigitalServiceDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<DigitalServiceDetailDto> {
  return toDigitalServiceDetailDto(loaded(await digitalServiceRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: DigitalServiceFilters,
  ordering: { field: DigitalServiceOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toDigitalServiceSummaryDto>>> {
  const { rows, total } = await digitalServiceRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toDigitalServiceSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(
  id: string,
  action: LifecycleAction,
  ctx: AuditContext,
): Promise<DigitalServiceDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await digitalServiceRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await digitalServiceRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: DIGITAL_SERVICE_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toDigitalServiceDetailDto(updated);
}

// ── Public reads (visibility predicate + Redis cache) ──────────────────────────
export async function publicList(
  filters: DigitalServiceFilters,
  ordering: { field: DigitalServiceOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicDigitalServiceDto>>> {
  const cached = await cacheService.getJson<ListResult<ReturnType<typeof toPublicDigitalServiceDto>>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await digitalServiceRepository.list(filters, page.skip, page.take, { public: true, ordering });
  const result = { items: rows.map(toPublicDigitalServiceDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export const digitalServiceService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  publicList,
};
