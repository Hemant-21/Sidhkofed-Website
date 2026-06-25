/**
 * Official Communication service — all business logic for the reusable Official Communication
 * operation. No HTTP, no Prisma here (repository owns Prisma; controllers own HTTP). Owns: CRUD +
 * lifecycle, stable slug generation, master-activation + linked-document validation, audit logging,
 * and Redis cache invalidation of public reads.
 *
 * Key rule (CMS requirements §4.6): an `expiry_date` is INFORMATIONAL ONLY — it NEVER
 * auto-unpublishes or auto-archives the record. The record stays public until a Publisher manually
 * unpublishes/archives it. Highlight expiry (handled by the shared scheduler) only clears the label.
 *
 * Cross-module dependencies go through SERVICES/shared helpers only — never another module's
 * repository (dependency-graph cross-module rule).
 */
import { NotFoundError, ValidationError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { assertEditableByActor } from '@/shared/content-guard';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { officialCommunicationRepository, type OfficialCommunicationRow } from './official-communications.repository';
import {
  toOfficialCommunicationDetailDto,
  toOfficialCommunicationSummaryDto,
  toPublicOfficialCommunicationDetailDto,
  toPublicOfficialCommunicationSummaryDto,
  type OfficialCommunicationDetailDto,
  type PublicOfficialCommunicationDetailDto,
} from './official-communications.dto';
import {
  OFFICIAL_COMMUNICATION_ENTITY,
  type OfficialCommunicationFilters,
  type OfficialCommunicationOrderingField,
} from './official-communications.types';
import {
  OFFICIAL_COMMUNICATION_PERMISSIONS,
  OFFICIAL_COMMUNICATION_PERMISSION_TO_CONTENT,
} from './official-communications.permissions';
import type {
  OfficialCommunicationCreateInput,
  OfficialCommunicationUpdateInput,
} from './official-communications.validators';

const PUBLIC_CACHE_PREFIX = 'official-communications:public';
// Routes gate on the seeded generic `content.*` set, so the content-guard compares against the
// mapped `content.publish` key (the logical `official-communications.publish` is never on authz).
const PUBLISH_PERMISSION =
  OFFICIAL_COMMUNICATION_PERMISSION_TO_CONTENT[OFFICIAL_COMMUNICATION_PERMISSIONS.publish] ?? 'content.publish';

function loaded(row: OfficialCommunicationRow | null): OfficialCommunicationRow {
  if (!row) throw new NotFoundError('Official communication not found.');
  return row;
}

async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

async function assertReferencesValid(
  refs: Parameters<typeof officialCommunicationRepository.validateReferences>[0],
): Promise<void> {
  const errors = await officialCommunicationRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(
  input: OfficialCommunicationCreateInput,
  ctx: AuditContext,
): Promise<OfficialCommunicationDetailDto> {
  const userId = requireUser(ctx);
  await assertReferencesValid({
    communicationTypeId: input.communication_type_id,
    documentId: input.document_id ?? null,
  });

  const slug = await uniqueSlug(input.title_en, officialCommunicationRepository.slugExists);

  const created = await officialCommunicationRepository.create({
    titleEn: input.title_en,
    titleHi: input.title_hi ?? null,
    summaryEn: input.summary_en ?? null,
    summaryHi: input.summary_hi ?? null,
    bodyEn: input.body_en ?? null,
    bodyHi: input.body_hi ?? null,
    communicationTypeId: input.communication_type_id,
    referenceNumber: input.reference_number ?? null,
    issueDate: input.issue_date ?? null,
    effectiveDate: input.effective_date ?? null,
    expiryDate: input.expiry_date ?? null,
    issuingAuthority: input.issuing_authority ?? null,
    documentId: input.document_id ?? null,
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
  });

  await auditService.create(ctx, OFFICIAL_COMMUNICATION_ENTITY, created.id, {
    title_en: created.titleEn,
    slug: created.slug,
  });
  await invalidatePublicCache();
  return toOfficialCommunicationDetailDto(created);
}

// ── Update (PATCH — partial; never transitions publication state) ──────────────
export async function update(
  id: string,
  input: OfficialCommunicationUpdateInput,
  ctx: AuditContext,
): Promise<OfficialCommunicationDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await officialCommunicationRepository.findById(id));
  // Content Editors may edit drafts only; a published/archived record requires a Publisher.
  assertEditableByActor(ctx.authz, existing.publicationState, PUBLISH_PERMISSION);

  await assertReferencesValid({
    communicationTypeId: input.communication_type_id,
    documentId: input.document_id ?? undefined,
  });

  const updated = await officialCommunicationRepository.update(id, {
    titleEn: input.title_en,
    titleHi: input.title_hi,
    summaryEn: input.summary_en,
    summaryHi: input.summary_hi,
    bodyEn: input.body_en,
    bodyHi: input.body_hi,
    communicationTypeId: input.communication_type_id,
    referenceNumber: input.reference_number,
    issueDate: input.issue_date,
    effectiveDate: input.effective_date,
    expiryDate: input.expiry_date,
    issuingAuthority: input.issuing_authority,
    documentId: input.document_id,
    publicVisibility: input.public_visibility,
    publishStartAt: input.publish_start_at,
    highlightType: input.highlight_type,
    highlightStartAt: input.highlight_start_at,
    highlightEndAt: input.highlight_end_at,
    displayOrder: input.display_order,
    showOnHomepage: input.show_on_homepage,
    updatedById: userId,
  });

  await auditService.update(ctx, OFFICIAL_COMMUNICATION_ENTITY, id, undefined, { title_en: updated.titleEn });
  await invalidatePublicCache();
  return toOfficialCommunicationDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<OfficialCommunicationDetailDto> {
  return toOfficialCommunicationDetailDto(loaded(await officialCommunicationRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: OfficialCommunicationFilters,
  ordering: { field: OfficialCommunicationOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toOfficialCommunicationSummaryDto>>> {
  const { rows, total } = await officialCommunicationRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toOfficialCommunicationSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(
  id: string,
  action: LifecycleAction,
  ctx: AuditContext,
): Promise<OfficialCommunicationDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await officialCommunicationRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await officialCommunicationRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: OFFICIAL_COMMUNICATION_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toOfficialCommunicationDetailDto(updated);
}

// ── Public reads (visibility predicate + Redis cache) ──────────────────────────
export async function publicList(
  filters: OfficialCommunicationFilters,
  ordering: { field: OfficialCommunicationOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicOfficialCommunicationSummaryDto>>> {
  const cached =
    await cacheService.getJson<ListResult<ReturnType<typeof toPublicOfficialCommunicationSummaryDto>>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await officialCommunicationRepository.list(filters, page.skip, page.take, {
    public: true,
    ordering,
  });
  const result = { items: rows.map(toPublicOfficialCommunicationSummaryDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export async function publicDetailBySlug(slug: string): Promise<PublicOfficialCommunicationDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicOfficialCommunicationDetailDto>(cacheKey);
  if (cached) return cached;
  const row = await officialCommunicationRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('Official communication not found.');
  const dto = toPublicOfficialCommunicationDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const officialCommunicationService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  publicList,
  publicDetailBySlug,
};
