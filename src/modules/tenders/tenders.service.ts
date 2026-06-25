/**
 * Tender service — all business logic for the Tender operation. No HTTP, no Prisma here (repository
 * owns Prisma; controllers own HTTP). Owns: CRUD + lifecycle, stable slug generation,
 * master-activation validation, audit logging, and Redis cache invalidation of public reads.
 *
 * Key rules (CMS requirements §4.7): the CMS stores tender METADATA + GeM link only — never BOQ,
 * corrigenda, clarifications, award/cancellation notices, tender files or bids. An expired tender
 * stays public until a Publisher manually unpublishes/archives it (expiry is never automatic).
 */
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { assertEditableByActor } from '@/shared/content-guard';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { tenderRepository, type TenderRow } from './tenders.repository';
import {
  toTenderDetailDto,
  toTenderSummaryDto,
  toPublicTenderDetailDto,
  toPublicTenderSummaryDto,
  type TenderDetailDto,
  type PublicTenderDetailDto,
} from './tenders.dto';
import { TENDER_ENTITY, type TenderFilters, type TenderOrderingField } from './tenders.types';
import { TENDER_PERMISSIONS, TENDER_PERMISSION_TO_CONTENT } from './tenders.permissions';
import type { TenderCreateInput, TenderUpdateInput } from './tenders.validators';

const PUBLIC_CACHE_PREFIX = 'tenders:public';
const PUBLISH_PERMISSION = TENDER_PERMISSION_TO_CONTENT[TENDER_PERMISSIONS.publish] ?? 'content.publish';

function loaded(row: TenderRow | null): TenderRow {
  if (!row) throw new NotFoundError('Tender not found.');
  return row;
}

async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

async function assertReferencesValid(refs: Parameters<typeof tenderRepository.validateReferences>[0]): Promise<void> {
  const errors = await tenderRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

const DUPLICATE_TENDER_NUMBER = 'A tender with this tender number already exists.';

/** True when `err` is a Prisma P2002 unique violation on a constraint covering `field`. */
function isUniqueViolation(err: unknown, field: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: string; meta?: { target?: unknown } };
  if (e.code !== 'P2002') return false;
  const target = e.meta?.target;
  const cols = Array.isArray(target) ? target.map(String) : typeof target === 'string' ? [target] : [];
  return cols.length === 0 || cols.some((c) => c.includes(field));
}

/**
 * Tender numbers are official reference codes and must be unique (Issue 2). This is the friendly
 * pre-check; the DB unique index is the race-safe backstop (a concurrent insert is mapped to the
 * same 409 in create/update). `excludeId` skips the record being updated. NULL/omitted is allowed
 * (multiple tenders may carry no number).
 */
async function assertTenderNumberUnique(tenderNumber: string | null | undefined, excludeId?: string): Promise<void> {
  if (!tenderNumber) return;
  if (await tenderRepository.tenderNumberExists(tenderNumber, excludeId)) {
    throw new ConflictError(DUPLICATE_TENDER_NUMBER);
  }
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: TenderCreateInput, ctx: AuditContext): Promise<TenderDetailDto> {
  const userId = requireUser(ctx);
  await assertReferencesValid({ tenderTypeId: input.tender_type_id });
  await assertTenderNumberUnique(input.tender_number);

  const slug = await uniqueSlug(input.title_en, tenderRepository.slugExists);

  let created: TenderRow;
  try {
    created = await tenderRepository.create({
      titleEn: input.title_en,
      titleHi: input.title_hi ?? null,
      summaryEn: input.summary_en ?? null,
      summaryHi: input.summary_hi ?? null,
      tenderTypeId: input.tender_type_id,
      tenderNumber: input.tender_number ?? null,
      publishDate: input.publish_date ?? null,
      submissionDeadline: input.submission_deadline ?? null,
      openingDate: input.opening_date ?? null,
      tenderStatus: input.tender_status ?? null,
      gemUrl: input.gem_url ?? null,
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
  } catch (err) {
    // Race: a concurrent create won the unique tender_number index first.
    if (isUniqueViolation(err, 'tender_number')) throw new ConflictError(DUPLICATE_TENDER_NUMBER);
    throw err;
  }

  await auditService.create(ctx, TENDER_ENTITY, created.id, { title_en: created.titleEn, slug: created.slug });
  await invalidatePublicCache();
  return toTenderDetailDto(created);
}

// ── Update (PATCH — partial; never transitions publication state) ──────────────
export async function update(id: string, input: TenderUpdateInput, ctx: AuditContext): Promise<TenderDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await tenderRepository.findById(id));
  assertEditableByActor(ctx.authz, existing.publicationState, PUBLISH_PERMISSION);

  await assertReferencesValid({ tenderTypeId: input.tender_type_id });
  // Only validate when the number is actually changing to a new non-null value (excludes self).
  if (input.tender_number !== undefined && input.tender_number !== existing.tenderNumber) {
    await assertTenderNumberUnique(input.tender_number, id);
  }

  let updated: TenderRow;
  try {
    updated = await tenderRepository.update(id, {
      titleEn: input.title_en,
      titleHi: input.title_hi,
      summaryEn: input.summary_en,
      summaryHi: input.summary_hi,
      tenderTypeId: input.tender_type_id,
      tenderNumber: input.tender_number,
      publishDate: input.publish_date,
      submissionDeadline: input.submission_deadline,
      openingDate: input.opening_date,
      tenderStatus: input.tender_status,
      gemUrl: input.gem_url,
      publicVisibility: input.public_visibility,
      publishStartAt: input.publish_start_at,
      highlightType: input.highlight_type,
      highlightStartAt: input.highlight_start_at,
      highlightEndAt: input.highlight_end_at,
      displayOrder: input.display_order,
      showOnHomepage: input.show_on_homepage,
      updatedById: userId,
    });
  } catch (err) {
    // Race: a concurrent write won the unique tender_number index first.
    if (isUniqueViolation(err, 'tender_number')) throw new ConflictError(DUPLICATE_TENDER_NUMBER);
    throw err;
  }

  await auditService.update(ctx, TENDER_ENTITY, id, undefined, { title_en: updated.titleEn });
  await invalidatePublicCache();
  return toTenderDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<TenderDetailDto> {
  return toTenderDetailDto(loaded(await tenderRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: TenderFilters,
  ordering: { field: TenderOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toTenderSummaryDto>>> {
  const { rows, total } = await tenderRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toTenderSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<TenderDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await tenderRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await tenderRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: TENDER_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toTenderDetailDto(updated);
}

// ── Public reads (visibility predicate + Redis cache) ──────────────────────────
export async function publicList(
  filters: TenderFilters,
  ordering: { field: TenderOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicTenderSummaryDto>>> {
  const cached = await cacheService.getJson<ListResult<ReturnType<typeof toPublicTenderSummaryDto>>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await tenderRepository.list(filters, page.skip, page.take, { public: true, ordering });
  const result = { items: rows.map(toPublicTenderSummaryDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export async function publicDetailBySlug(slug: string): Promise<PublicTenderDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicTenderDetailDto>(cacheKey);
  if (cached) return cached;
  const row = await tenderRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('Tender not found.');
  const dto = toPublicTenderDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const tenderService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  publicList,
  publicDetailBySlug,
};
