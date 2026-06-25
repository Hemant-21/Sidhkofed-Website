/**
 * Page DTOs + mappers (API spec §5/§6 + §1.4 reference shapes).
 *
 * Shapes: admin summary (list), admin detail (single), public detail. The public surface is a
 * detail-by-slug only (`GET /public/pages/{slug}` — API spec §5); there is no public list. Public
 * responses never expose `created_by`/`updated_by`. The slug is the stable public route key.
 */
import type { PageRow } from './pages.repository';

const publicUrl = (slug: string): string => `/pages/${slug}`;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface PageSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  publication_state: string;
  public_visibility: boolean;
  show_on_homepage: boolean;
  highlight_type: string | null;
  display_order: number | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toPageSummaryDto(p: PageRow): PageSummaryDto {
  return {
    id: p.id,
    slug: p.slug,
    title_en: p.titleEn,
    title_hi: p.titleHi,
    publication_state: p.publicationState,
    public_visibility: p.publicVisibility,
    show_on_homepage: p.showOnHomepage,
    highlight_type: p.highlightType,
    display_order: p.displayOrder,
    published_at: iso(p.publishedAt),
    archived_at: iso(p.archivedAt),
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface PageDetailDto extends PageSummaryDto {
  body_en: string | null;
  body_hi: string | null;
  meta_title_en: string | null;
  meta_title_hi: string | null;
  meta_description_en: string | null;
  meta_description_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

export function toPageDetailDto(p: PageRow): PageDetailDto {
  return {
    ...toPageSummaryDto(p),
    body_en: p.bodyEn,
    body_hi: p.bodyHi,
    meta_title_en: p.metaTitleEn,
    meta_title_hi: p.metaTitleHi,
    meta_description_en: p.metaDescriptionEn,
    meta_description_hi: p.metaDescriptionHi,
    publish_start_at: iso(p.publishStartAt),
    highlight_start_at: iso(p.highlightStartAt),
    highlight_end_at: iso(p.highlightEndAt),
    created_by: p.createdById,
    updated_by: p.updatedById,
    public_url: publicUrl(p.slug),
  };
}

// ── Public detail (single) ────────────────────────────────────────────────────
export interface PublicPageDetailDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  body_en: string | null;
  body_hi: string | null;
  meta_title_en: string | null;
  meta_title_hi: string | null;
  meta_description_en: string | null;
  meta_description_hi: string | null;
  highlight_type: string | null;
  public_url: string;
}

export function toPublicPageDetailDto(p: PageRow): PublicPageDetailDto {
  return {
    id: p.id,
    slug: p.slug,
    title_en: p.titleEn,
    title_hi: p.titleHi,
    body_en: p.bodyEn,
    body_hi: p.bodyHi,
    meta_title_en: p.metaTitleEn,
    meta_title_hi: p.metaTitleHi,
    meta_description_en: p.metaDescriptionEn,
    meta_description_hi: p.metaDescriptionHi,
    highlight_type: p.highlightType,
    public_url: publicUrl(p.slug),
  };
}
