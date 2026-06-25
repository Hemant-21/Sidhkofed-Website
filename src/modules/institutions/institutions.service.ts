/**
 * Institution service — all business logic for the reusable Institution operation. No HTTP, no
 * Prisma here (repository owns Prisma; controllers own HTTP). Owns: CRUD + lifecycle, stable slug
 * generation, master-activation validation, logo media-usage tracking (so a linked logo cannot be
 * hard-deleted), audit logging, and Redis cache invalidation of public reads.
 *
 * Cross-module dependencies go through SERVICES only (mediaService / mediaUsageService /
 * auditService) — never another module's repository (dependency-graph cross-module rule).
 */
import { NotFoundError, ValidationError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { mediaService } from '@/modules/media/media.service';
import { mediaUsageService } from '@/modules/media/media-usage.service';
import { MEDIA_TYPE_REGISTRY } from '@/modules/media/media.validation';
import { institutionRepository, type InstitutionRow } from './institutions.repository';
import {
  toInstitutionDetailDto,
  toInstitutionSummaryDto,
  toPublicInstitutionDetailDto,
  toPublicInstitutionSummaryDto,
  type InstitutionDetailDto,
  type PublicInstitutionDetailDto,
} from './institutions.dto';
import { INSTITUTION_ENTITY, type InstitutionFilters, type InstitutionOrderingField } from './institutions.types';
import type { InstitutionCreateInput, InstitutionUpdateInput } from './institutions.validators';

const LOGO_FIELD = 'logo_media_id';
const PUBLIC_CACHE_PREFIX = 'institutions:public';

function loaded(row: InstitutionRow | null): InstitutionRow {
  if (!row) throw new NotFoundError('Institution not found.');
  return row;
}

async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

/** Validate a media asset is linkable as an image logo (exists, not archived, image category). */
async function assertLinkableLogo(mediaId: string): Promise<void> {
  let media: Awaited<ReturnType<typeof mediaService.getById>>;
  try {
    media = await mediaService.getById(mediaId);
  } catch {
    throw new ValidationError({ [LOGO_FIELD]: ['Media asset not found.'] });
  }
  if (media.archived_at) throw new ValidationError({ [LOGO_FIELD]: ['Cannot link an archived media asset.'] });
  const def = MEDIA_TYPE_REGISTRY[media.mime_type];
  if (!def || def.category !== 'image') {
    throw new ValidationError({ [LOGO_FIELD]: ['Logo must be an image.'] });
  }
}

async function assertReferencesValid(refs: Parameters<typeof institutionRepository.validateReferences>[0]): Promise<void> {
  const errors = await institutionRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: InstitutionCreateInput, ctx: AuditContext): Promise<InstitutionDetailDto> {
  const userId = requireUser(ctx);
  if (input.logo_media_id) await assertLinkableLogo(input.logo_media_id);
  await assertReferencesValid({ institutionTypeId: input.institution_type_id, districtId: input.district_id ?? null });

  const slug = await uniqueSlug(input.name_en, institutionRepository.slugExists);

  const institution = await institutionRepository.transaction(async (tx) => {
    const created = await institutionRepository.create(
      {
        institutionTypeId: input.institution_type_id,
        nameEn: input.name_en,
        nameHi: input.name_hi ?? null,
        descriptionEn: input.description_en ?? null,
        descriptionHi: input.description_hi ?? null,
        addressEn: input.address_en ?? null,
        addressHi: input.address_hi ?? null,
        websiteUrl: input.website_url ?? null,
        logoMediaId: input.logo_media_id ?? null,
        districtId: input.district_id ?? null,
        contactEmail: input.contact_email ?? null,
        contactPhone: input.contact_phone ?? null,
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
    if (input.logo_media_id) {
      await mediaUsageService.registerUsage(
        { mediaId: input.logo_media_id, entityType: INSTITUTION_ENTITY, entityId: created.id, field: LOGO_FIELD },
        tx,
      );
    }
    return created;
  });

  await auditService.create(ctx, INSTITUTION_ENTITY, institution.id, { name_en: institution.nameEn, slug: institution.slug });
  await invalidatePublicCache();
  return toInstitutionDetailDto(loaded(await institutionRepository.findById(institution.id)));
}

// ── Update (PATCH — partial; never transitions publication state) ──────────────
export async function update(id: string, input: InstitutionUpdateInput, ctx: AuditContext): Promise<InstitutionDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await institutionRepository.findById(id));

  const logoChanging = input.logo_media_id !== undefined && input.logo_media_id !== existing.logoMediaId;
  if (logoChanging && input.logo_media_id) await assertLinkableLogo(input.logo_media_id);
  await assertReferencesValid({
    institutionTypeId: input.institution_type_id,
    districtId: input.district_id ?? undefined,
  });

  const updated = await institutionRepository.transaction(async (tx) => {
    const row = await institutionRepository.update(
      id,
      {
        institutionTypeId: input.institution_type_id,
        nameEn: input.name_en,
        nameHi: input.name_hi,
        descriptionEn: input.description_en,
        descriptionHi: input.description_hi,
        addressEn: input.address_en,
        addressHi: input.address_hi,
        websiteUrl: input.website_url,
        logoMediaId: input.logo_media_id,
        districtId: input.district_id,
        contactEmail: input.contact_email,
        contactPhone: input.contact_phone,
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
    if (logoChanging) {
      if (existing.logoMediaId) {
        await mediaUsageService.removeUsage(
          { mediaId: existing.logoMediaId, entityType: INSTITUTION_ENTITY, entityId: id, field: LOGO_FIELD },
          tx,
        );
      }
      if (input.logo_media_id) {
        await mediaUsageService.registerUsage(
          { mediaId: input.logo_media_id, entityType: INSTITUTION_ENTITY, entityId: id, field: LOGO_FIELD },
          tx,
        );
      }
    }
    return row;
  });

  await auditService.update(ctx, INSTITUTION_ENTITY, id, undefined, { name_en: updated.nameEn });
  await invalidatePublicCache();
  return toInstitutionDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<InstitutionDetailDto> {
  return toInstitutionDetailDto(loaded(await institutionRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: InstitutionFilters,
  ordering: { field: InstitutionOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toInstitutionSummaryDto>>> {
  const { rows, total } = await institutionRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toInstitutionSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<InstitutionDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await institutionRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await institutionRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: INSTITUTION_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toInstitutionDetailDto(updated);
}

// ── Public reads (visibility predicate + Redis cache) ──────────────────────────
export async function publicList(
  filters: InstitutionFilters,
  ordering: { field: InstitutionOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicInstitutionSummaryDto>>> {
  const cached = await cacheService.getJson<ListResult<ReturnType<typeof toPublicInstitutionSummaryDto>>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await institutionRepository.list(filters, page.skip, page.take, { public: true, ordering });
  const result = { items: rows.map(toPublicInstitutionSummaryDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export async function publicDetailBySlug(slug: string): Promise<PublicInstitutionDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicInstitutionDetailDto>(cacheKey);
  if (cached) return cached;
  const row = await institutionRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('Institution not found.');
  const dto = toPublicInstitutionDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const institutionService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  publicList,
  publicDetailBySlug,
};
