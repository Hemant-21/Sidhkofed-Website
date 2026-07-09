/**
 * Leadership DTOs + mappers (mirrors digital-services.dto.ts §5/§6 + §1.4 reference shapes).
 *
 * Shapes: admin summary (list), admin detail (single), public summary/detail. The optional photo is
 * a compact media reference. Public responses never expose `created_by`/`updated_by` or storage keys.
 */
import type { MediaAsset } from '@prisma/client';
import type { LeadershipRow } from './leadership.repository';

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
export interface LeadershipSummaryDto {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  govt_role_en: string;
  govt_role_hi: string | null;
  sidhkofed_role_en: string;
  sidhkofed_role_hi: string | null;
  photo: MediaRef | null;
  publication_state: string;
  public_visibility: boolean;
  highlight_type: string | null;
  display_order: number | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toLeadershipSummaryDto(s: LeadershipRow): LeadershipSummaryDto {
  return {
    id: s.id,
    slug: s.slug,
    name_en: s.nameEn,
    name_hi: s.nameHi,
    govt_role_en: s.govtRoleEn,
    govt_role_hi: s.govtRoleHi,
    sidhkofed_role_en: s.sidhkofedRoleEn,
    sidhkofed_role_hi: s.sidhkofedRoleHi,
    photo: mediaRef(s.photoMedia),
    publication_state: s.publicationState,
    public_visibility: s.publicVisibility,
    highlight_type: s.highlightType,
    display_order: s.displayOrder,
    published_at: iso(s.publishedAt),
    archived_at: iso(s.archivedAt),
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface LeadershipDetailDto extends LeadershipSummaryDto {
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export function toLeadershipDetailDto(s: LeadershipRow): LeadershipDetailDto {
  return {
    ...toLeadershipSummaryDto(s),
    publish_start_at: iso(s.publishStartAt),
    highlight_start_at: iso(s.highlightStartAt),
    highlight_end_at: iso(s.highlightEndAt),
    created_by: s.createdById,
    updated_by: s.updatedById,
  };
}

// ── Public summary/detail (list carries the full card shape) ───────────────────
export interface PublicLeadershipDto {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  govt_role_en: string;
  govt_role_hi: string | null;
  sidhkofed_role_en: string;
  sidhkofed_role_hi: string | null;
  photo: MediaRef | null;
  display_order: number | null;
}

export function toPublicLeadershipDto(s: LeadershipRow): PublicLeadershipDto {
  return {
    id: s.id,
    slug: s.slug,
    name_en: s.nameEn,
    name_hi: s.nameHi,
    govt_role_en: s.govtRoleEn,
    govt_role_hi: s.govtRoleHi,
    sidhkofed_role_en: s.sidhkofedRoleEn,
    sidhkofed_role_hi: s.sidhkofedRoleHi,
    photo: mediaRef(s.photoMedia),
    display_order: s.displayOrder,
  };
}
