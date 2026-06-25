/**
 * Page service — all business logic for the Page operation. No HTTP, no Prisma here (repository owns
 * Prisma; controllers own HTTP). Owns: CRUD + lifecycle, stable slug generation, audit logging, and
 * Redis cache invalidation of public reads.
 *
 * Key rules (CMS requirements §4.10): the slug is generated once on create and stays stable; pages
 * are reusable content records. No page builder / drag-and-drop — only page content + page-only SEO
 * meta are CMS-managed. The homepage layout itself remains code-controlled.
 */
import { NotFoundError, ValidationError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { assertEditableByActor } from '@/shared/content-guard';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { pageRepository, type PageRow } from './pages.repository';
import {
  toPageDetailDto,
  toPageSummaryDto,
  toPublicPageDetailDto,
  type PageDetailDto,
  type PublicPageDetailDto,
} from './pages.dto';
import { PAGE_ENTITY, type PageFilters, type PageOrderingField } from './pages.types';
import { PAGE_PERMISSIONS, PAGE_PERMISSION_TO_CONTENT } from './pages.permissions';
import type { PageCreateInput, PageUpdateInput } from './pages.validators';

const PUBLIC_CACHE_PREFIX = 'pages:public';
const PUBLISH_PERMISSION = PAGE_PERMISSION_TO_CONTENT[PAGE_PERMISSIONS.publish] ?? 'content.publish';

function loaded(row: PageRow | null): PageRow {
  if (!row) throw new NotFoundError('Page not found.');
  return row;
}

async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: PageCreateInput, ctx: AuditContext): Promise<PageDetailDto> {
  const userId = requireUser(ctx);
  const slug = await uniqueSlug(input.title_en, pageRepository.slugExists);

  const created = await pageRepository.create({
    titleEn: input.title_en,
    titleHi: input.title_hi ?? null,
    bodyEn: input.body_en ?? null,
    bodyHi: input.body_hi ?? null,
    metaTitleEn: input.meta_title_en ?? null,
    metaTitleHi: input.meta_title_hi ?? null,
    metaDescriptionEn: input.meta_description_en ?? null,
    metaDescriptionHi: input.meta_description_hi ?? null,
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

  await auditService.create(ctx, PAGE_ENTITY, created.id, { title_en: created.titleEn, slug: created.slug });
  await invalidatePublicCache();
  return toPageDetailDto(created);
}

// ── Update (PATCH — partial; never transitions publication state, never changes slug) ──
export async function update(id: string, input: PageUpdateInput, ctx: AuditContext): Promise<PageDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await pageRepository.findById(id));
  assertEditableByActor(ctx.authz, existing.publicationState, PUBLISH_PERMISSION);

  const updated = await pageRepository.update(id, {
    titleEn: input.title_en,
    titleHi: input.title_hi,
    bodyEn: input.body_en,
    bodyHi: input.body_hi,
    metaTitleEn: input.meta_title_en,
    metaTitleHi: input.meta_title_hi,
    metaDescriptionEn: input.meta_description_en,
    metaDescriptionHi: input.meta_description_hi,
    publicVisibility: input.public_visibility,
    publishStartAt: input.publish_start_at,
    highlightType: input.highlight_type,
    highlightStartAt: input.highlight_start_at,
    highlightEndAt: input.highlight_end_at,
    displayOrder: input.display_order,
    showOnHomepage: input.show_on_homepage,
    updatedById: userId,
  });

  await auditService.update(ctx, PAGE_ENTITY, id, undefined, { title_en: updated.titleEn });
  await invalidatePublicCache();
  return toPageDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<PageDetailDto> {
  return toPageDetailDto(loaded(await pageRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: PageFilters,
  ordering: { field: PageOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toPageSummaryDto>>> {
  const { rows, total } = await pageRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toPageSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<PageDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await pageRepository.findById(id));
  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await pageRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: PAGE_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toPageDetailDto(updated);
}

// ── Public read (visibility predicate + Redis cache) ───────────────────────────
export async function publicDetailBySlug(slug: string): Promise<PublicPageDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicPageDetailDto>(cacheKey);
  if (cached) return cached;
  const row = await pageRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('Page not found.');
  const dto = toPublicPageDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const pageService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  publicDetailBySlug,
};
