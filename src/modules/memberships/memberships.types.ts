/**
 * Institutional Membership shared types — the framework-free filter/ordering contract used by the
 * controller, service, and repository (mirrors institutions.types.ts). Institution-wise membership
 * ONLY (CMS requirements §4.15 / API spec §5/§6). Two orthogonal axes — `membership_level`
 * (sidhkofed | district_union) × `membership_type` (primary | nominal) — feed dashboard reports
 * #10–#13. This module is a DATA SOURCE only; it performs no aggregation (Phase 12 owns that).
 */
import type { PublicationState } from '@/shared/publishing';

/** Entity key used for the audit module name. */
export const MEMBERSHIP_ENTITY = 'institutional_membership';

/** The two classification enums (lower-case snake_case per architecture-validation §C7). */
export const MEMBERSHIP_LEVELS = ['sidhkofed', 'district_union'] as const;
export const MEMBERSHIP_TYPES = ['primary', 'nominal'] as const;
export const MEMBERSHIP_STATUSES = ['active', 'inactive'] as const;

export type MembershipLevel = (typeof MEMBERSHIP_LEVELS)[number];
export type MembershipType = (typeof MEMBERSHIP_TYPES)[number];
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** Admin/public list filters. All optional; the repository only reads known keys. */
export interface MembershipFilters {
  publicationState?: PublicationState;
  institution?: string; // id or slug — the member institution
  membershipLevel?: MembershipLevel;
  membershipType?: MembershipType;
  district?: string; // id or slug — geographic district
  districtUnion?: string; // id or slug — the DU org (an Institution); admin-only
  reportingPeriod?: string; // id or slug
  status?: MembershipStatus;
  showOnHomepage?: boolean;
  year?: number; // join_date calendar year
}

/** Allowed ordering fields (API spec §5: `display_order,join_date`). */
export const MEMBERSHIP_ORDERING_FIELDS = [
  'display_order',
  'join_date',
  'published_at',
  'created_at',
] as const;

export type MembershipOrderingField = (typeof MEMBERSHIP_ORDERING_FIELDS)[number];
