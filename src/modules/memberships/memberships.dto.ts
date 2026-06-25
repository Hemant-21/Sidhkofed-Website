/**
 * Institutional Membership DTOs + mappers (API spec §5/§6 + §1.4 reference shapes).
 *
 * Shapes: admin summary (list), admin detail (single), public summary, public detail. Linked
 * Institution / District Union are compact institution references; District / Reporting Period are
 * compact master references. Public responses NEVER expose internal notes, `created_by`/
 * `updated_by`, or audit-only fields (API spec §1.3). This module exposes clean data only — it
 * performs no aggregation (dashboard reports #10–#13 are Phase 12).
 */
import type { MembershipRow } from './memberships.repository';

export interface InstitutionRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
function institutionRef(
  i: { id: string; slug: string; nameEn: string; nameHi: string | null } | null,
): InstitutionRef | null {
  if (!i) return null;
  return { id: i.id, slug: i.slug, name_en: i.nameEn, name_hi: i.nameHi };
}

export interface MasterRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
function masterRef(
  m: { id: string; slug: string; nameEn: string; nameHi: string | null } | null,
): MasterRef | null {
  if (!m) return null;
  return { id: m.id, slug: m.slug, name_en: m.nameEn, name_hi: m.nameHi };
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
/** A DATE column → `YYYY-MM-DD` (API spec date contract), or null. */
const dateStr = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);
const publicUrl = (slug: string): string => `/memberships/${slug}`;

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface MembershipSummaryDto {
  id: string;
  slug: string;
  institution: InstitutionRef | null;
  membership_level: string;
  membership_type: string;
  membership_number: string | null;
  district: MasterRef | null;
  district_union: InstitutionRef | null;
  reporting_period: MasterRef | null;
  status: string;
  join_date: string | null;
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

export function toMembershipSummaryDto(m: MembershipRow): MembershipSummaryDto {
  return {
    id: m.id,
    slug: m.slug,
    institution: institutionRef(m.institution),
    membership_level: m.membershipLevel,
    membership_type: m.membershipType,
    membership_number: m.membershipNumber,
    district: masterRef(m.district),
    district_union: institutionRef(m.districtUnion),
    reporting_period: masterRef(m.reportingPeriod),
    status: m.status,
    join_date: dateStr(m.joinDate),
    publication_state: m.publicationState,
    public_visibility: m.publicVisibility,
    show_on_homepage: m.showOnHomepage,
    highlight_type: m.highlightType,
    display_order: m.displayOrder,
    published_at: iso(m.publishedAt),
    archived_at: iso(m.archivedAt),
    created_at: m.createdAt.toISOString(),
    updated_at: m.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) — adds internal notes + scheduling + authorship ──────
export interface MembershipDetailDto extends MembershipSummaryDto {
  notes_en: string | null;
  notes_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export function toMembershipDetailDto(m: MembershipRow): MembershipDetailDto {
  return {
    ...toMembershipSummaryDto(m),
    notes_en: m.notesEn,
    notes_hi: m.notesHi,
    publish_start_at: iso(m.publishStartAt),
    highlight_start_at: iso(m.highlightStartAt),
    highlight_end_at: iso(m.highlightEndAt),
    created_by: m.createdById,
    updated_by: m.updatedById,
  };
}

// ── Public summary (directory list) — no internal notes/authorship/audit fields ─
export interface PublicMembershipSummaryDto {
  id: string;
  slug: string;
  institution: InstitutionRef | null;
  membership_level: string;
  membership_type: string;
  membership_number: string | null;
  district: MasterRef | null;
  district_union: InstitutionRef | null;
  reporting_period: MasterRef | null;
  status: string;
  join_date: string | null;
  highlight_type: string | null;
  public_url: string;
}

export function toPublicMembershipSummaryDto(m: MembershipRow): PublicMembershipSummaryDto {
  return {
    id: m.id,
    slug: m.slug,
    institution: institutionRef(m.institution),
    membership_level: m.membershipLevel,
    membership_type: m.membershipType,
    membership_number: m.membershipNumber,
    district: masterRef(m.district),
    district_union: institutionRef(m.districtUnion),
    reporting_period: masterRef(m.reportingPeriod),
    status: m.status,
    join_date: dateStr(m.joinDate),
    highlight_type: m.highlightType,
    public_url: publicUrl(m.slug),
  };
}

// ── Public detail — directory record only (same safe shape as summary) ─────────
export type PublicMembershipDetailDto = PublicMembershipSummaryDto;
export const toPublicMembershipDetailDto = toPublicMembershipSummaryDto;
