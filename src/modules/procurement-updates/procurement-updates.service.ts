/**
 * Procurement Update service — all business logic for the Procurement Update operation. No HTTP, no
 * Prisma here (repository owns Prisma; controllers own HTTP). Owns: CRUD + lifecycle, stable slug
 * generation, master-activation + block/district + linked-document validation, audit logging, and
 * Redis cache invalidation of public reads.
 *
 * Key rule (CMS requirements §4.8 / non-goals): this module is INFORMATION-ONLY. It stores no
 * procurement transactions, inventory, warehousing, beneficiary, or payment data. Conditional
 * rate/date/location fields are simply optional columns the editor fills where relevant.
 */
import { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { assertEditableByActor } from '@/shared/content-guard';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { procurementUpdateRepository, type ProcurementUpdateRow } from './procurement-updates.repository';
import {
  toProcurementUpdateDetailDto,
  toProcurementUpdateSummaryDto,
  toPublicProcurementUpdateDetailDto,
  toPublicProcurementUpdateSummaryDto,
  type ProcurementUpdateDetailDto,
  type PublicProcurementUpdateDetailDto,
} from './procurement-updates.dto';
import {
  PROCUREMENT_UPDATE_ENTITY,
  type ProcurementUpdateFilters,
  type ProcurementUpdateOrderingField,
} from './procurement-updates.types';
import {
  PROCUREMENT_UPDATE_PERMISSIONS,
  PROCUREMENT_UPDATE_PERMISSION_TO_CONTENT,
} from './procurement-updates.permissions';
import type {
  ProcurementUpdateCreateInput,
  ProcurementUpdateUpdateInput,
} from './procurement-updates.validators';

const PUBLIC_CACHE_PREFIX = 'procurement-updates:public';
const PUBLISH_PERMISSION =
  PROCUREMENT_UPDATE_PERMISSION_TO_CONTENT[PROCUREMENT_UPDATE_PERMISSIONS.publish] ?? 'content.publish';

/** Convert an optional rate number into a Prisma.Decimal, preserving create/PATCH semantics. */
function rateToDecimal(v: number | null | undefined): Prisma.Decimal | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return new Prisma.Decimal(v);
}

function loaded(row: ProcurementUpdateRow | null): ProcurementUpdateRow {
  if (!row) throw new NotFoundError('Procurement update not found.');
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
  refs: Parameters<typeof procurementUpdateRepository.validateReferences>[0],
): Promise<void> {
  const errors = await procurementUpdateRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(
  input: ProcurementUpdateCreateInput,
  ctx: AuditContext,
): Promise<ProcurementUpdateDetailDto> {
  const userId = requireUser(ctx);
  await assertReferencesValid({
    procurementUpdateTypeId: input.procurement_update_type_id,
    commodityId: input.commodity_id ?? null,
    districtId: input.district_id ?? null,
    blockId: input.block_id ?? null,
    programmeSchemeId: input.programme_scheme_id ?? null,
    documentId: input.document_id ?? null,
  });

  const slug = await uniqueSlug(input.title_en, procurementUpdateRepository.slugExists);

  const created = await procurementUpdateRepository.create({
    titleEn: input.title_en,
    titleHi: input.title_hi ?? null,
    summaryEn: input.summary_en ?? null,
    summaryHi: input.summary_hi ?? null,
    descriptionEn: input.description_en ?? null,
    descriptionHi: input.description_hi ?? null,
    procurementUpdateTypeId: input.procurement_update_type_id,
    commodityId: input.commodity_id ?? null,
    rate: rateToDecimal(input.rate) ?? null,
    unit: input.unit ?? null,
    effectiveDate: input.effective_date ?? null,
    periodStart: input.period_start ?? null,
    periodEnd: input.period_end ?? null,
    districtId: input.district_id ?? null,
    blockId: input.block_id ?? null,
    locationText: input.location_text ?? null,
    programmeSchemeId: input.programme_scheme_id ?? null,
    documentId: input.document_id ?? null,
    status: input.status ?? null,
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

  await auditService.create(ctx, PROCUREMENT_UPDATE_ENTITY, created.id, {
    title_en: created.titleEn,
    slug: created.slug,
  });
  await invalidatePublicCache();
  return toProcurementUpdateDetailDto(created);
}

// ── Update (PATCH — partial; never transitions publication state) ──────────────
export async function update(
  id: string,
  input: ProcurementUpdateUpdateInput,
  ctx: AuditContext,
): Promise<ProcurementUpdateDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await procurementUpdateRepository.findById(id));
  assertEditableByActor(ctx.authz, existing.publicationState, PUBLISH_PERMISSION);

  // When changing a block but not the district, validate against the EXISTING district so an
  // orphaned block (belonging to a different district) is rejected.
  const districtForBlock = input.district_id !== undefined ? input.district_id : existing.districtId;
  await assertReferencesValid({
    procurementUpdateTypeId: input.procurement_update_type_id,
    commodityId: input.commodity_id ?? undefined,
    districtId: input.district_id ?? undefined,
    blockId: input.block_id ?? undefined,
    // Pass the effective district only when a block is being set, so consistency is checked.
    ...(input.block_id ? { districtId: districtForBlock ?? undefined } : {}),
    programmeSchemeId: input.programme_scheme_id ?? undefined,
    documentId: input.document_id ?? undefined,
  });

  const updated = await procurementUpdateRepository.update(id, {
    titleEn: input.title_en,
    titleHi: input.title_hi,
    summaryEn: input.summary_en,
    summaryHi: input.summary_hi,
    descriptionEn: input.description_en,
    descriptionHi: input.description_hi,
    procurementUpdateTypeId: input.procurement_update_type_id,
    commodityId: input.commodity_id,
    rate: rateToDecimal(input.rate),
    unit: input.unit,
    effectiveDate: input.effective_date,
    periodStart: input.period_start,
    periodEnd: input.period_end,
    districtId: input.district_id,
    blockId: input.block_id,
    locationText: input.location_text,
    programmeSchemeId: input.programme_scheme_id,
    documentId: input.document_id,
    status: input.status,
    publicVisibility: input.public_visibility,
    publishStartAt: input.publish_start_at,
    highlightType: input.highlight_type,
    highlightStartAt: input.highlight_start_at,
    highlightEndAt: input.highlight_end_at,
    displayOrder: input.display_order,
    showOnHomepage: input.show_on_homepage,
    updatedById: userId,
  });

  await auditService.update(ctx, PROCUREMENT_UPDATE_ENTITY, id, undefined, { title_en: updated.titleEn });
  await invalidatePublicCache();
  return toProcurementUpdateDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<ProcurementUpdateDetailDto> {
  return toProcurementUpdateDetailDto(loaded(await procurementUpdateRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: ProcurementUpdateFilters,
  ordering: { field: ProcurementUpdateOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toProcurementUpdateSummaryDto>>> {
  const { rows, total } = await procurementUpdateRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toProcurementUpdateSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(
  id: string,
  action: LifecycleAction,
  ctx: AuditContext,
): Promise<ProcurementUpdateDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await procurementUpdateRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await procurementUpdateRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: PROCUREMENT_UPDATE_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toProcurementUpdateDetailDto(updated);
}

// ── Public reads (visibility predicate + Redis cache) ──────────────────────────
export async function publicList(
  filters: ProcurementUpdateFilters,
  ordering: { field: ProcurementUpdateOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicProcurementUpdateSummaryDto>>> {
  const cached =
    await cacheService.getJson<ListResult<ReturnType<typeof toPublicProcurementUpdateSummaryDto>>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await procurementUpdateRepository.list(filters, page.skip, page.take, {
    public: true,
    ordering,
  });
  const result = { items: rows.map(toPublicProcurementUpdateSummaryDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export async function publicDetailBySlug(slug: string): Promise<PublicProcurementUpdateDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicProcurementUpdateDetailDto>(cacheKey);
  if (cached) return cached;
  const row = await procurementUpdateRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('Procurement update not found.');
  const dto = toPublicProcurementUpdateDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const procurementUpdateService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  publicList,
  publicDetailBySlug,
};
