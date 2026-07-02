/**
 * Programme service — business logic for the reusable ProgrammeScheme operation. CRUD + lifecycle,
 * stable slug, master-activation validation, commodity + permitted-training-type junction writes
 * (transactional), cover media-usage tracking, audit, and public-cache invalidation. Cross-module
 * work goes through services only (mediaService / mediaUsageService / auditService).
 */
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { assertEditableByActor } from '@/shared/content-guard';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { mediaService } from '@/modules/media/media.service';
import { mediaUsageService } from '@/modules/media/media-usage.service';
import { MEDIA_TYPE_REGISTRY } from '@/modules/media/media.validation';
import { programmeRepository, type ProgrammeRow } from './programmes.repository';
import {
  toProgrammeDetailDto,
  toProgrammeSummaryDto,
  toPublicProgrammeDetailDto,
  toPublicProgrammeSummaryDto,
  type ProgrammeDetailDto,
  type PublicProgrammeDetailDto,
} from './programmes.dto';
import { PROGRAMME_ENTITY, type ProgrammeFilters, type ProgrammeOrderingField } from './programmes.types';
import { PROGRAMME_PERMISSIONS } from './programmes.permissions';
import type { ProgrammeCreateInput, ProgrammeUpdateInput } from './programmes.validators';

const COVER_FIELD = 'cover_media_id';
const PUBLIC_CACHE_PREFIX = 'programmes:public';

function loaded(row: ProgrammeRow | null): ProgrammeRow {
  if (!row) throw new NotFoundError('Programme not found.');
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

async function assertReferencesValid(refs: Parameters<typeof programmeRepository.validateReferences>[0]): Promise<void> {
  const errors = await programmeRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: ProgrammeCreateInput, ctx: AuditContext): Promise<ProgrammeDetailDto> {
  const userId = requireUser(ctx);
  // Duplicate-name validation (codex §4.2) — case-insensitive, independent of slug uniqueness.
  if (await programmeRepository.nameExists(input.title_en, undefined)) {
    throw new ConflictError(`A programme named "${input.title_en.trim()}" already exists.`);
  }
  if (input.cover_media_id) await assertLinkableCover(input.cover_media_id);
  await assertReferencesValid({
    commodityIds: input.commodity_ids,
    permittedTrainingTypeIds: input.permitted_training_type_ids,
  });

  const slug = await uniqueSlug(input.title_en, programmeRepository.slugExists);

  const programme = await programmeRepository.transaction(async (tx) => {
    const created = await programmeRepository.create(
      {
        titleEn: input.title_en,
        titleHi: input.title_hi ?? null,
        shortCode: input.short_code ?? null,
        summaryEn: input.summary_en ?? null,
        summaryHi: input.summary_hi ?? null,
        descriptionEn: input.description_en ?? null,
        descriptionHi: input.description_hi ?? null,
        objectivesEn: input.objectives_en ?? null,
        objectivesHi: input.objectives_hi ?? null,
        eligibilityEn: input.eligibility_en ?? null,
        eligibilityHi: input.eligibility_hi ?? null,
        benefitsEn: input.benefits_en ?? null,
        benefitsHi: input.benefits_hi ?? null,
        applicationProcessEn: input.application_process_en ?? null,
        applicationProcessHi: input.application_process_hi ?? null,
        fundingSource: input.funding_source ?? null,
        startDate: input.start_date ?? null,
        endDate: input.end_date ?? null,
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
    if (input.commodity_ids?.length) await programmeRepository.setCommodities(created.id, input.commodity_ids, tx);
    if (input.permitted_training_type_ids?.length) {
      await programmeRepository.setPermittedTrainingTypes(created.id, input.permitted_training_type_ids, tx);
    }
    if (input.cover_media_id) {
      await mediaUsageService.registerUsage(
        { mediaId: input.cover_media_id, entityType: PROGRAMME_ENTITY, entityId: created.id, field: COVER_FIELD },
        tx,
      );
    }
    return created;
  });

  await auditService.create(ctx, PROGRAMME_ENTITY, programme.id, { title_en: programme.titleEn, slug: programme.slug });
  await invalidatePublicCache();
  return toProgrammeDetailDto(loaded(await programmeRepository.findById(programme.id)));
}

// ── Update ──────────────────────────────────────────────────────────────────────
export async function update(id: string, input: ProgrammeUpdateInput, ctx: AuditContext): Promise<ProgrammeDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await programmeRepository.findById(id));
  // Content Editors may edit drafts only; a published/archived programme requires a Publisher.
  assertEditableByActor(ctx.authz, existing.publicationState, PROGRAMME_PERMISSIONS.publish);

  // Duplicate-name validation on rename (codex §4.2), excluding this record.
  if (input.title_en !== undefined && (await programmeRepository.nameExists(input.title_en, id))) {
    throw new ConflictError(`A programme named "${input.title_en.trim()}" already exists.`);
  }

  const coverChanging = input.cover_media_id !== undefined && input.cover_media_id !== existing.coverMediaId;
  if (coverChanging && input.cover_media_id) await assertLinkableCover(input.cover_media_id);
  await assertReferencesValid({
    commodityIds: input.commodity_ids,
    permittedTrainingTypeIds: input.permitted_training_type_ids,
  });

  // End/start consistency against merged state (a partial update may change only one date).
  const mergedStart = input.start_date !== undefined ? input.start_date : existing.startDate;
  const mergedEnd = input.end_date !== undefined ? input.end_date : existing.endDate;
  if (mergedStart && mergedEnd && mergedEnd.getTime() < mergedStart.getTime()) {
    throw new ValidationError({ end_date: ['Must be on or after the start date.'] });
  }

  const updated = await programmeRepository.transaction(async (tx) => {
    const row = await programmeRepository.update(
      id,
      {
        titleEn: input.title_en,
        titleHi: input.title_hi,
        shortCode: input.short_code,
        summaryEn: input.summary_en,
        summaryHi: input.summary_hi,
        descriptionEn: input.description_en,
        descriptionHi: input.description_hi,
        objectivesEn: input.objectives_en,
        objectivesHi: input.objectives_hi,
        eligibilityEn: input.eligibility_en,
        eligibilityHi: input.eligibility_hi,
        benefitsEn: input.benefits_en,
        benefitsHi: input.benefits_hi,
        applicationProcessEn: input.application_process_en,
        applicationProcessHi: input.application_process_hi,
        fundingSource: input.funding_source,
        startDate: input.start_date,
        endDate: input.end_date,
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
    if (input.commodity_ids !== undefined) await programmeRepository.setCommodities(id, input.commodity_ids, tx);
    if (input.permitted_training_type_ids !== undefined) {
      await programmeRepository.setPermittedTrainingTypes(id, input.permitted_training_type_ids, tx);
    }
    if (coverChanging) {
      if (existing.coverMediaId) {
        await mediaUsageService.removeUsage(
          { mediaId: existing.coverMediaId, entityType: PROGRAMME_ENTITY, entityId: id, field: COVER_FIELD },
          tx,
        );
      }
      if (input.cover_media_id) {
        await mediaUsageService.registerUsage(
          { mediaId: input.cover_media_id, entityType: PROGRAMME_ENTITY, entityId: id, field: COVER_FIELD },
          tx,
        );
      }
    }
    return row;
  });

  await auditService.update(ctx, PROGRAMME_ENTITY, id, undefined, { title_en: updated.titleEn });
  await invalidatePublicCache();
  return toProgrammeDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<ProgrammeDetailDto> {
  return toProgrammeDetailDto(loaded(await programmeRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: ProgrammeFilters,
  ordering: { field: ProgrammeOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toProgrammeSummaryDto>>> {
  const { rows, total } = await programmeRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toProgrammeSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<ProgrammeDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await programmeRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await programmeRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: PROGRAMME_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toProgrammeDetailDto(updated);
}

// ── Public reads ─────────────────────────────────────────────────────────────
export async function publicList(
  filters: ProgrammeFilters,
  ordering: { field: ProgrammeOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicProgrammeSummaryDto>>> {
  const cached = await cacheService.getJson<ListResult<ReturnType<typeof toPublicProgrammeSummaryDto>>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await programmeRepository.list(filters, page.skip, page.take, { public: true, ordering });
  const result = { items: rows.map(toPublicProgrammeSummaryDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export async function publicDetailBySlug(slug: string): Promise<PublicProgrammeDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicProgrammeDetailDto>(cacheKey);
  if (cached) return cached;
  const row = await programmeRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('Programme not found.');
  const dto = toPublicProgrammeDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const programmeService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  publicList,
  publicDetailBySlug,
};
