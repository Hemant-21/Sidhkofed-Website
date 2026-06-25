/**
 * Toolkit DTOs + mappers (API spec §5/§6). Shapes: admin summary/detail, public summary/detail.
 * Reuses the shared compact reference shapes (MediaRef, MasterRef) and the Programme reference.
 * `toToolkitRef` is the compact cross-module reference.
 */
import type { Toolkit } from '@prisma/client';
import { mediaRef, type MediaRef, type MasterRef } from '@/modules/institutions/institutions.dto';
import { type ProgrammeRef } from '@/modules/programmes/programmes.dto';
import { toToolkitItemDto, toPublicToolkitItemDto, type ToolkitItemDto, type PublicToolkitItemDto } from './items/items.dto';
import type { ToolkitRow, ToolkitSummaryRow } from './toolkits.repository';

function masterRef(m: { id: string; slug: string; nameEn: string; nameHi: string | null }): MasterRef {
  return { id: m.id, slug: m.slug, name_en: m.nameEn, name_hi: m.nameHi };
}
function programmeRef(p: { id: string; slug: string; titleEn: string; titleHi: string | null; shortCode: string | null }): ProgrammeRef {
  return { id: p.id, slug: p.slug, title_en: p.titleEn, title_hi: p.titleHi, short_code: p.shortCode };
}

const publicUrl = (slug: string): string => `/toolkits/${slug}`;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

// ── Compact cross-module reference ─────────────────────────────────────────────
export interface ToolkitRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
}
export function toToolkitRef(t: Toolkit): ToolkitRef {
  return { id: t.id, slug: t.slug, title_en: t.titleEn, title_hi: t.titleHi };
}

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface ToolkitSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  programme: ProgrammeRef | null;
  commodity: MasterRef | null;
  cover_media: MediaRef | null;
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

export function toToolkitSummaryDto(t: ToolkitSummaryRow): ToolkitSummaryDto {
  return {
    id: t.id,
    slug: t.slug,
    title_en: t.titleEn,
    title_hi: t.titleHi,
    summary_en: t.summaryEn,
    programme: t.programmeScheme ? programmeRef(t.programmeScheme) : null,
    commodity: t.commodity ? masterRef(t.commodity) : null,
    cover_media: mediaRef(t.coverMedia),
    publication_state: t.publicationState,
    public_visibility: t.publicVisibility,
    show_on_homepage: t.showOnHomepage,
    highlight_type: t.highlightType,
    display_order: t.displayOrder,
    published_at: iso(t.publishedAt),
    archived_at: iso(t.archivedAt),
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface ToolkitDetailDto extends ToolkitSummaryDto {
  summary_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  items: ToolkitItemDto[];
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

export function toToolkitDetailDto(t: ToolkitRow): ToolkitDetailDto {
  return {
    ...toToolkitSummaryDto(t),
    summary_hi: t.summaryHi,
    description_en: t.descriptionEn,
    description_hi: t.descriptionHi,
    items: t.items.map(toToolkitItemDto),
    publish_start_at: iso(t.publishStartAt),
    highlight_start_at: iso(t.highlightStartAt),
    highlight_end_at: iso(t.highlightEndAt),
    created_by: t.createdById,
    updated_by: t.updatedById,
    public_url: publicUrl(t.slug),
  };
}

// ── Public summary (list) ─────────────────────────────────────────────────────
export interface PublicToolkitSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  programme: ProgrammeRef | null;
  commodity: MasterRef | null;
  cover_media: MediaRef | null;
  highlight_type: string | null;
  public_url: string;
}

export function toPublicToolkitSummaryDto(t: ToolkitSummaryRow): PublicToolkitSummaryDto {
  return {
    id: t.id,
    slug: t.slug,
    title_en: t.titleEn,
    title_hi: t.titleHi,
    summary_en: t.summaryEn,
    summary_hi: t.summaryHi,
    programme: t.programmeScheme ? programmeRef(t.programmeScheme) : null,
    commodity: t.commodity ? masterRef(t.commodity) : null,
    cover_media: mediaRef(t.coverMedia),
    highlight_type: t.highlightType,
    public_url: publicUrl(t.slug),
  };
}

// ── Public detail (single) ────────────────────────────────────────────────────
export interface PublicToolkitDetailDto extends PublicToolkitSummaryDto {
  description_en: string | null;
  description_hi: string | null;
  items: PublicToolkitItemDto[];
}

export function toPublicToolkitDetailDto(t: ToolkitRow): PublicToolkitDetailDto {
  return {
    ...toPublicToolkitSummaryDto(t),
    description_en: t.descriptionEn,
    description_hi: t.descriptionHi,
    items: t.items.filter((i) => i.isActive).map(toPublicToolkitItemDto),
  };
}
