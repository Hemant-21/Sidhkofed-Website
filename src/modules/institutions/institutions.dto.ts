/**
 * Institution DTOs + mappers (API spec §5/§6 + §1.4 reference shapes).
 *
 * Shapes: admin summary (list), admin detail (single), public summary, public detail.
 * `toInstitutionRef` is the compact cross-module reference (id, slug, name) that the Events
 * module reuses. Public responses never expose `created_by`/`updated_by` or storage keys.
 */
import type { Institution, InstitutionType, District, MediaAsset } from '@prisma/client';
import type { InstitutionRow } from './institutions.repository';

export interface MasterRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
function masterRef(m: { id: string; slug: string; nameEn: string; nameHi: string | null }): MasterRef {
  return { id: m.id, slug: m.slug, name_en: m.nameEn, name_hi: m.nameHi };
}

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

const publicUrl = (slug: string): string => `/institutions/${slug}`;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

// ── Compact cross-module reference (§1.4) ─────────────────────────────────────
export interface InstitutionRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
export function toInstitutionRef(i: Institution): InstitutionRef {
  return { id: i.id, slug: i.slug, name_en: i.nameEn, name_hi: i.nameHi };
}

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface InstitutionSummaryDto {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  institution_type: MasterRef;
  district: MasterRef | null;
  logo: MediaRef | null;
  website_url: string | null;
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

export function toInstitutionSummaryDto(i: InstitutionRow): InstitutionSummaryDto {
  return {
    id: i.id,
    slug: i.slug,
    name_en: i.nameEn,
    name_hi: i.nameHi,
    institution_type: masterRef(i.institutionType),
    district: i.district ? masterRef(i.district) : null,
    logo: mediaRef(i.logoMedia),
    website_url: i.websiteUrl,
    publication_state: i.publicationState,
    public_visibility: i.publicVisibility,
    show_on_homepage: i.showOnHomepage,
    highlight_type: i.highlightType,
    display_order: i.displayOrder,
    published_at: iso(i.publishedAt),
    archived_at: iso(i.archivedAt),
    created_at: i.createdAt.toISOString(),
    updated_at: i.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface InstitutionDetailDto extends InstitutionSummaryDto {
  description_en: string | null;
  description_hi: string | null;
  address_en: string | null;
  address_hi: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

export function toInstitutionDetailDto(i: InstitutionRow): InstitutionDetailDto {
  return {
    ...toInstitutionSummaryDto(i),
    description_en: i.descriptionEn,
    description_hi: i.descriptionHi,
    address_en: i.addressEn,
    address_hi: i.addressHi,
    contact_email: i.contactEmail,
    contact_phone: i.contactPhone,
    publish_start_at: iso(i.publishStartAt),
    highlight_start_at: iso(i.highlightStartAt),
    highlight_end_at: iso(i.highlightEndAt),
    created_by: i.createdById,
    updated_by: i.updatedById,
    public_url: publicUrl(i.slug),
  };
}

// ── Public summary (list) ─────────────────────────────────────────────────────
export interface PublicInstitutionSummaryDto {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  institution_type: MasterRef;
  district: MasterRef | null;
  logo: MediaRef | null;
  website_url: string | null;
  highlight_type: string | null;
  public_url: string;
}

export function toPublicInstitutionSummaryDto(i: InstitutionRow): PublicInstitutionSummaryDto {
  return {
    id: i.id,
    slug: i.slug,
    name_en: i.nameEn,
    name_hi: i.nameHi,
    institution_type: masterRef(i.institutionType),
    district: i.district ? masterRef(i.district) : null,
    logo: mediaRef(i.logoMedia),
    website_url: i.websiteUrl,
    highlight_type: i.highlightType,
    public_url: publicUrl(i.slug),
  };
}

// ── Public detail (single) ────────────────────────────────────────────────────
export interface PublicInstitutionDetailDto extends PublicInstitutionSummaryDto {
  description_en: string | null;
  description_hi: string | null;
  address_en: string | null;
  address_hi: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export function toPublicInstitutionDetailDto(i: InstitutionRow): PublicInstitutionDetailDto {
  return {
    ...toPublicInstitutionSummaryDto(i),
    description_en: i.descriptionEn,
    description_hi: i.descriptionHi,
    address_en: i.addressEn,
    address_hi: i.addressHi,
    contact_email: i.contactEmail,
    contact_phone: i.contactPhone,
  };
}

// Re-export types used by mappers' signatures.
export type { Institution, InstitutionType, District };
