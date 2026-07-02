/**
 * Digital Service DTOs + mappers (API spec §5/§6 + §1.4 reference shapes).
 *
 * Shapes: admin summary (list), admin detail (single), public summary/detail. `external_url` is an
 * approved external system link the client opens in a NEW TAB with rel="noopener noreferrer". The
 * optional icon is a compact media reference. Public responses never expose `created_by`/`updated_by`
 * or storage keys.
 */
import type { MediaAsset } from '@prisma/client';
import type { DigitalServiceRow } from './digital-services.repository';

/** Compact media reference (API spec §1.4). */
export interface MediaRef {
  id: string;
  url: string;
  file_name: string;
  mime_type: string;
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
}
export function mediaRef(a: MediaAsset | null): MediaRef | null {
  if (!a) return null;
  return {
    id: a.id,
    url: a.url,
    file_name: a.fileName,
    mime_type: a.mimeType,
    title: a.title,
    alt_text: a.altText,
    caption: a.caption,
    width: a.width,
    height: a.height,
  };
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface DigitalServiceSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  external_url: string;
  icon: MediaRef | null;
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

export function toDigitalServiceSummaryDto(s: DigitalServiceRow): DigitalServiceSummaryDto {
  return {
    id: s.id,
    slug: s.slug,
    title_en: s.titleEn,
    title_hi: s.titleHi,
    external_url: s.externalUrl,
    icon: mediaRef(s.iconMedia),
    publication_state: s.publicationState,
    public_visibility: s.publicVisibility,
    show_on_homepage: s.showOnHomepage,
    highlight_type: s.highlightType,
    display_order: s.displayOrder,
    published_at: iso(s.publishedAt),
    archived_at: iso(s.archivedAt),
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface DigitalServiceDetailDto extends DigitalServiceSummaryDto {
  description_en: string | null;
  description_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export function toDigitalServiceDetailDto(s: DigitalServiceRow): DigitalServiceDetailDto {
  return {
    ...toDigitalServiceSummaryDto(s),
    description_en: s.descriptionEn,
    description_hi: s.descriptionHi,
    publish_start_at: iso(s.publishStartAt),
    highlight_start_at: iso(s.highlightStartAt),
    highlight_end_at: iso(s.highlightEndAt),
    created_by: s.createdById,
    updated_by: s.updatedById,
  };
}

// ── Public summary/detail (list carries the full card shape) ───────────────────
export interface PublicDigitalServiceDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  external_url: string;
  icon: MediaRef | null;
  highlight_type: string | null;
  /** Clients MUST open external services in a new tab with rel="noopener noreferrer" (§4.14). */
  opens_new_tab: true;
}

export function toPublicDigitalServiceDto(s: DigitalServiceRow): PublicDigitalServiceDto {
  return {
    id: s.id,
    slug: s.slug,
    title_en: s.titleEn,
    title_hi: s.titleHi,
    description_en: s.descriptionEn,
    description_hi: s.descriptionHi,
    external_url: s.externalUrl,
    icon: mediaRef(s.iconMedia),
    highlight_type: s.highlightType,
    opens_new_tab: true,
  };
}
