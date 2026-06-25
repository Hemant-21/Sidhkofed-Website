/**
 * Event service — all business logic for the one Events operation (CMS requirements §4.1).
 * Owns: CRUD + lifecycle, derived status (date-based unless overridden), the controlled
 * dynamic-field validation, the five relationship junctions, cover media-usage tracking,
 * completion (guarded against duplicate completion), cancellation, audit, and public-cache
 * invalidation. No HTTP, no Prisma here. Cross-module work goes through services only.
 */
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { mediaService } from '@/modules/media/media.service';
import { mediaUsageService } from '@/modules/media/media-usage.service';
import { MEDIA_TYPE_REGISTRY } from '@/modules/media/media.validation';
import type { EventStatus, Prisma } from '@prisma/client';
import { eventRepository, type EventRow } from './events.repository';
import { deriveEventStatus, canCompleteEvent, canCancelEvent } from './events.status';
import { validateDynamicValues } from './events.dynamic-fields';
import {
  toEventDetailDto,
  toEventSummaryDto,
  toPublicEventDetailDto,
  toPublicEventSummaryDto,
  type EventDetailDto,
  type PublicEventDetailDto,
} from './events.dto';
import { EVENT_ENTITY, type EventFilters, type EventOrderingField } from './events.types';
import type { EventCreateInput, EventUpdateInput, EventCompleteInput, EventCancelInput } from './events.validators';

const COVER_FIELD = 'cover_media_id';
const PUBLIC_CACHE_PREFIX = 'events:public';

function loaded(row: EventRow | null): EventRow {
  if (!row) throw new NotFoundError('Event not found.');
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

async function assertReferencesValid(refs: Parameters<typeof eventRepository.validateReferences>[0]): Promise<void> {
  const errors = await eventRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

/** Load active field definitions and validate the supplied dynamic values; returns normalized. */
async function validateDynamic(eventTypeId: string, raw: Record<string, unknown> | null | undefined): Promise<Prisma.InputJsonValue> {
  const defs = await eventRepository.activeFieldDefinitions(eventTypeId);
  const normalized = validateDynamicValues(raw, defs);
  return normalized as Prisma.InputJsonValue;
}

/** Resolve the effective status for create/update from override + dates. */
function resolveStatus(args: {
  statusOverride: boolean;
  manualStatus?: EventStatus;
  startDate: Date;
  endDate: Date | null;
}): EventStatus {
  if (args.statusOverride && args.manualStatus) {
    return deriveEventStatus({ startDate: args.startDate, endDate: args.endDate, statusOverride: true, manualStatus: args.manualStatus });
  }
  return deriveEventStatus({ startDate: args.startDate, endDate: args.endDate, statusOverride: false, manualStatus: 'scheduled' });
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: EventCreateInput, ctx: AuditContext): Promise<EventDetailDto> {
  const userId = requireUser(ctx);
  if (input.cover_media_id) await assertLinkableCover(input.cover_media_id);
  await assertReferencesValid({
    eventTypeId: input.event_type_id,
    trainingTypeId: input.training_type_id ?? null,
    districtId: input.district_id ?? null,
    blockId: input.block_id ?? null,
    commodityIds: input.commodity_ids,
    programmeIds: input.programme_ids,
    institutionIds: input.institution_ids,
    documentIds: input.document_ids,
    galleryIds: input.gallery_ids,
  });
  const ttErrors = await eventRepository.validateTrainingTypeAgainstProgrammes(input.training_type_id ?? null, input.programme_ids);
  if (Object.keys(ttErrors).length > 0) throw new ValidationError(ttErrors);

  const dynamicValues = await validateDynamic(input.event_type_id, input.dynamic_values);
  const statusOverride = input.status_override ?? false;
  const eventStatus = resolveStatus({
    statusOverride,
    manualStatus: input.event_status,
    startDate: input.start_date,
    endDate: input.end_date ?? null,
  });
  const slug = await uniqueSlug(input.title_en, eventRepository.slugExists);

  const event = await eventRepository.transaction(async (tx) => {
    const created = await eventRepository.create(
      {
        eventTypeId: input.event_type_id,
        trainingTypeId: input.training_type_id ?? null,
        titleEn: input.title_en,
        titleHi: input.title_hi ?? null,
        summaryEn: input.summary_en ?? null,
        summaryHi: input.summary_hi ?? null,
        descriptionEn: input.description_en ?? null,
        descriptionHi: input.description_hi ?? null,
        dateMode: input.date_mode,
        startDate: input.start_date,
        endDate: input.end_date ?? null,
        locationText: input.location_text ?? null,
        districtId: input.district_id ?? null,
        blockId: input.block_id ?? null,
        coverMediaId: input.cover_media_id ?? null,
        eventStatus,
        statusOverride,
        dynamicValues,
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
    if (input.commodity_ids?.length) await eventRepository.setCommodities(created.id, input.commodity_ids, tx);
    if (input.programme_ids?.length) await eventRepository.setProgrammes(created.id, input.programme_ids, tx);
    if (input.institution_ids?.length) await eventRepository.setInstitutions(created.id, input.institution_ids, tx);
    if (input.document_ids?.length) await eventRepository.setDocuments(created.id, input.document_ids, tx);
    if (input.gallery_ids?.length) await eventRepository.setGalleries(created.id, input.gallery_ids, tx);
    if (input.cover_media_id) {
      await mediaUsageService.registerUsage(
        { mediaId: input.cover_media_id, entityType: EVENT_ENTITY, entityId: created.id, field: COVER_FIELD },
        tx,
      );
    }
    return created;
  });

  await auditService.create(ctx, EVENT_ENTITY, event.id, { title_en: event.titleEn, slug: event.slug, event_status: event.eventStatus });
  await invalidatePublicCache();
  return toEventDetailDto(loaded(await eventRepository.findById(event.id)));
}

// ── Update (PATCH — never transitions publication state) ───────────────────────
export async function update(id: string, input: EventUpdateInput, ctx: AuditContext): Promise<EventDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await eventRepository.findById(id));

  const coverChanging = input.cover_media_id !== undefined && input.cover_media_id !== existing.coverMediaId;
  if (coverChanging && input.cover_media_id) await assertLinkableCover(input.cover_media_id);

  await assertReferencesValid({
    eventTypeId: input.event_type_id,
    trainingTypeId: input.training_type_id ?? undefined,
    districtId: input.district_id ?? undefined,
    blockId: input.block_id ?? undefined,
    commodityIds: input.commodity_ids,
    programmeIds: input.programme_ids,
    institutionIds: input.institution_ids,
    documentIds: input.document_ids,
    galleryIds: input.gallery_ids,
  });

  // Merged values for cross-field rules.
  const eventTypeId = input.event_type_id ?? existing.eventTypeId;
  const startDate = input.start_date ?? existing.startDate;
  const endDate = input.end_date !== undefined ? input.end_date : existing.endDate;
  const dateMode = input.date_mode ?? existing.dateMode;
  if ((dateMode === 'range' || dateMode === 'multi_day') && !endDate) {
    throw new ValidationError({ end_date: ['end_date is required for a date range.'] });
  }
  if (endDate && endDate.getTime() < startDate.getTime()) {
    throw new ValidationError({ end_date: ['Must be on or after start_date.'] });
  }

  const trainingTypeId = input.training_type_id !== undefined ? input.training_type_id : existing.trainingTypeId;
  const programmeIds = input.programme_ids; // only re-checked when provided
  if (programmeIds !== undefined) {
    const ttErrors = await eventRepository.validateTrainingTypeAgainstProgrammes(trainingTypeId ?? null, programmeIds);
    if (Object.keys(ttErrors).length > 0) throw new ValidationError(ttErrors);
  }

  // Re-validate dynamic values when supplied OR when the event type changes.
  let dynamicValues: Prisma.InputJsonValue | undefined;
  if (input.dynamic_values !== undefined || input.event_type_id !== undefined) {
    const raw = input.dynamic_values !== undefined
      ? input.dynamic_values
      : (existing.dynamicValues as Record<string, unknown> | null);
    dynamicValues = await validateDynamic(eventTypeId, raw);
  }

  // Status recompute: honour an explicit override, else derive from the merged dates.
  const statusOverride = input.status_override !== undefined ? input.status_override : existing.statusOverride;
  let eventStatus: EventStatus | undefined;
  if (input.status_override !== undefined || input.event_status !== undefined || input.start_date !== undefined || input.end_date !== undefined) {
    const manual = input.event_status ?? (existing.eventStatus === 'postponed' || existing.eventStatus === 'cancelled' ? existing.eventStatus : undefined);
    eventStatus = resolveStatus({ statusOverride, manualStatus: manual, startDate, endDate });
  }

  const updated = await eventRepository.transaction(async (tx) => {
    const row = await eventRepository.update(
      id,
      {
        eventTypeId: input.event_type_id,
        trainingTypeId: input.training_type_id,
        titleEn: input.title_en,
        titleHi: input.title_hi,
        summaryEn: input.summary_en,
        summaryHi: input.summary_hi,
        descriptionEn: input.description_en,
        descriptionHi: input.description_hi,
        dateMode: input.date_mode,
        startDate: input.start_date,
        endDate: input.end_date,
        locationText: input.location_text,
        districtId: input.district_id,
        blockId: input.block_id,
        coverMediaId: input.cover_media_id,
        ...(dynamicValues !== undefined ? { dynamicValues } : {}),
        ...(eventStatus !== undefined ? { eventStatus } : {}),
        ...(input.status_override !== undefined ? { statusOverride } : {}),
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
    if (input.commodity_ids !== undefined) await eventRepository.setCommodities(id, input.commodity_ids, tx);
    if (input.programme_ids !== undefined) await eventRepository.setProgrammes(id, input.programme_ids, tx);
    if (input.institution_ids !== undefined) await eventRepository.setInstitutions(id, input.institution_ids, tx);
    if (input.document_ids !== undefined) await eventRepository.setDocuments(id, input.document_ids, tx);
    if (input.gallery_ids !== undefined) await eventRepository.setGalleries(id, input.gallery_ids, tx);
    if (coverChanging) {
      if (existing.coverMediaId) {
        await mediaUsageService.removeUsage(
          { mediaId: existing.coverMediaId, entityType: EVENT_ENTITY, entityId: id, field: COVER_FIELD },
          tx,
        );
      }
      if (input.cover_media_id) {
        await mediaUsageService.registerUsage(
          { mediaId: input.cover_media_id, entityType: EVENT_ENTITY, entityId: id, field: COVER_FIELD },
          tx,
        );
      }
    }
    return row;
  });

  await auditService.update(ctx, EVENT_ENTITY, id, undefined, { title_en: updated.titleEn });
  await invalidatePublicCache();
  return toEventDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<EventDetailDto> {
  return toEventDetailDto(loaded(await eventRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: EventFilters,
  ordering: { field: EventOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toEventSummaryDto>>> {
  const { rows, total } = await eventRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toEventSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<EventDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await eventRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await eventRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: EVENT_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toEventDetailDto(updated);
}

// ── Complete (capture outcome fields; guard against duplicate completion) ──────
export async function complete(id: string, input: EventCompleteInput, ctx: AuditContext): Promise<EventDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await eventRepository.findById(id));
  if (existing.completedDate) {
    throw new ConflictError('Event is already completed.');
  }
  // Issue 5: a cancelled event cannot be completed (only in-flight events may be completed).
  if (!canCompleteEvent(existing.eventStatus, Boolean(existing.completedDate))) {
    throw new ConflictError(`Cannot complete a ${existing.eventStatus} event.`);
  }
  if (input.gallery_ids?.length || input.document_ids?.length) {
    await assertReferencesValid({ galleryIds: input.gallery_ids, documentIds: input.document_ids });
  }
  const completedDate = input.completed_date ?? new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');

  await eventRepository.transaction(async (tx) => {
    await eventRepository.update(
      id,
      {
        eventStatus: 'completed',
        statusOverride: false, // completion is a real status, not a manual override
        outcomeSummaryEn: input.outcome_summary_en,
        outcomeSummaryHi: input.outcome_summary_hi,
        keyHighlights: input.key_highlights,
        finalParticipantCount: input.final_participant_count,
        participantMaleCount: input.participant_male_count,
        participantFemaleCount: input.participant_female_count,
        participantOtherCount: input.participant_other_count,
        completionRemarksEn: input.completion_remarks_en,
        completionRemarksHi: input.completion_remarks_hi,
        completedDate,
        updatedById: userId,
      },
      tx,
    );
    // Completion gallery/documents are ADDED to (not replaced) — merge with existing links.
    if (input.gallery_ids?.length) {
      const merged = [...new Set([...existing.galleries.map((g) => g.galleryId), ...input.gallery_ids])];
      await eventRepository.setGalleries(id, merged, tx);
    }
    if (input.document_ids?.length) {
      const merged = [...new Set([...existing.documents.map((d) => d.documentId), ...input.document_ids])];
      await eventRepository.setDocuments(id, merged, tx);
    }
  });

  await auditService.log('UPDATE', ctx, {
    module: EVENT_ENTITY,
    recordId: id,
    summary: 'EVENT_COMPLETED',
    previousState: existing.eventStatus,
    newState: 'completed',
  });
  await invalidatePublicCache();
  return toEventDetailDto(loaded(await eventRepository.findById(id)));
}

// ── Cancel (manual override; retains original date, supports revised date) ─────
export async function cancel(id: string, input: EventCancelInput, ctx: AuditContext): Promise<EventDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await eventRepository.findById(id));
  if (existing.eventStatus === 'cancelled') throw new ConflictError('Event is already cancelled.');
  // Issue 5: a completed event cannot be cancelled (only in-flight events may be cancelled).
  if (!canCancelEvent(existing.eventStatus, Boolean(existing.completedDate))) {
    throw new ConflictError('Cannot cancel a completed event.');
  }
  const updated = await eventRepository.update(id, {
    eventStatus: 'cancelled',
    statusOverride: true,
    cancellationReason: input.cancellation_reason ?? null,
    revisedStartDate: input.revised_start_date ?? null,
    updatedById: userId,
  });
  await auditService.log('UPDATE', ctx, {
    module: EVENT_ENTITY,
    recordId: id,
    summary: 'EVENT_CANCELLED',
    previousState: existing.eventStatus,
    newState: 'cancelled',
  });
  await invalidatePublicCache();
  return toEventDetailDto(updated);
}

// ── Public reads ─────────────────────────────────────────────────────────────
export async function publicList(
  filters: EventFilters,
  ordering: { field: EventOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicEventSummaryDto>>> {
  const cached = await cacheService.getJson<ListResult<ReturnType<typeof toPublicEventSummaryDto>>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await eventRepository.list(filters, page.skip, page.take, { public: true, ordering });
  const result = { items: rows.map(toPublicEventSummaryDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export async function publicDetailBySlug(slug: string): Promise<PublicEventDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicEventDetailDto>(cacheKey);
  if (cached) return cached;
  const row = await eventRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('Event not found.');
  // Linked documents / galleries / news are already filtered to public-visible rows by the
  // repository's publicEventInclude (single shared predicate, incl. the publish_start_at gate).
  const dto = toPublicEventDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const eventService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  complete,
  cancel,
  publicList,
  publicDetailBySlug,
};
