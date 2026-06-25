/**
 * FAQ service — all business logic for the FAQ operation. No HTTP, no Prisma here (repository owns
 * Prisma; controllers own HTTP). Owns: CRUD + lifecycle, stable slug generation, FAQ-category
 * activation validation, audit logging, and Redis cache invalidation of public reads.
 *
 * Key rules (CMS requirements §4.13): FAQs reuse the FAQ Category master; there are no nested FAQs;
 * public search covers question + answer; ordering follows category + display order.
 */
import { NotFoundError, ValidationError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { assertEditableByActor } from '@/shared/content-guard';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { faqRepository, type FaqRow } from './faqs.repository';
import {
  toFaqDetailDto,
  toFaqSummaryDto,
  toPublicFaqDto,
  type FaqDetailDto,
} from './faqs.dto';
import { FAQ_ENTITY, type FaqFilters, type FaqOrderingField } from './faqs.types';
import { FAQ_PERMISSIONS, FAQ_PERMISSION_TO_CONTENT } from './faqs.permissions';
import type { FaqCreateInput, FaqUpdateInput } from './faqs.validators';

const PUBLIC_CACHE_PREFIX = 'faqs:public';
const PUBLISH_PERMISSION = FAQ_PERMISSION_TO_CONTENT[FAQ_PERMISSIONS.publish] ?? 'content.publish';

function loaded(row: FaqRow | null): FaqRow {
  if (!row) throw new NotFoundError('FAQ not found.');
  return row;
}

async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

async function assertReferencesValid(refs: Parameters<typeof faqRepository.validateReferences>[0]): Promise<void> {
  const errors = await faqRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: FaqCreateInput, ctx: AuditContext): Promise<FaqDetailDto> {
  const userId = requireUser(ctx);
  await assertReferencesValid({ faqCategoryId: input.faq_category_id ?? null });

  const slug = await uniqueSlug(input.question_en, faqRepository.slugExists);

  const created = await faqRepository.create({
    faqCategoryId: input.faq_category_id ?? null,
    questionEn: input.question_en,
    questionHi: input.question_hi ?? null,
    answerEn: input.answer_en,
    answerHi: input.answer_hi ?? null,
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

  await auditService.create(ctx, FAQ_ENTITY, created.id, { question_en: created.questionEn, slug: created.slug });
  await invalidatePublicCache();
  return toFaqDetailDto(created);
}

// ── Update (PATCH — partial; never transitions publication state, never changes slug) ──
export async function update(id: string, input: FaqUpdateInput, ctx: AuditContext): Promise<FaqDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await faqRepository.findById(id));
  assertEditableByActor(ctx.authz, existing.publicationState, PUBLISH_PERMISSION);

  if (input.faq_category_id !== undefined) {
    await assertReferencesValid({ faqCategoryId: input.faq_category_id });
  }

  const updated = await faqRepository.update(id, {
    faqCategoryId: input.faq_category_id,
    questionEn: input.question_en,
    questionHi: input.question_hi,
    answerEn: input.answer_en,
    answerHi: input.answer_hi,
    publicVisibility: input.public_visibility,
    publishStartAt: input.publish_start_at,
    highlightType: input.highlight_type,
    highlightStartAt: input.highlight_start_at,
    highlightEndAt: input.highlight_end_at,
    displayOrder: input.display_order,
    showOnHomepage: input.show_on_homepage,
    updatedById: userId,
  });

  await auditService.update(ctx, FAQ_ENTITY, id, undefined, { question_en: updated.questionEn });
  await invalidatePublicCache();
  return toFaqDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<FaqDetailDto> {
  return toFaqDetailDto(loaded(await faqRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: FaqFilters,
  ordering: { field: FaqOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toFaqSummaryDto>>> {
  const { rows, total } = await faqRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toFaqSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<FaqDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await faqRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await faqRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: FAQ_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toFaqDetailDto(updated);
}

// ── Public reads (visibility predicate + Redis cache) ──────────────────────────
export async function publicList(
  filters: FaqFilters,
  ordering: { field: FaqOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicFaqDto>>> {
  const cached = await cacheService.getJson<ListResult<ReturnType<typeof toPublicFaqDto>>>(cacheKey);
  if (cached) return cached;
  const { rows, total } = await faqRepository.list(filters, page.skip, page.take, { public: true, ordering });
  const result = { items: rows.map(toPublicFaqDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export const faqService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  publicList,
};
