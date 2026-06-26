/**
<<<<<<< HEAD
 * Memberships module types — mirror of the backend DTOs/validators (memberships.dto.ts /
 * memberships.validators.ts). Institutional Membership is a publishable **P** content resource
 * carrying the workflow mixin, authorized with the shared `content.*` RBAC keys. `institution_id`,
 * `membership_level`, and `membership_type` are required; everything else is optional.
=======
 * Institutional Membership module types — a faithful mirror of the backend Membership DTOs
 * (memberships.dto.ts) and request validators (memberships.validators.ts). The frontend consumes
 * these contracts exactly; it never invents fields. `snake_case` matches the API transport
 * (API spec §0).
 *
 * Institution-wise membership ONLY (codex §4.15 / API spec §5/§6). Two orthogonal axes —
 * `membership_level` (sidhkofed | district_union) × `membership_type` (primary | nominal) — feed
 * dashboard reports #10–#13. This is a publishable **P** resource carrying the shared
 * publishing-workflow mixin; it is authorized with the generic `content.*` RBAC set
 * (memberships.routes.ts), so permission keys are reused from the events feature.
 *
 * NOTE (backend fidelity): the membership entity has NO `financial_year_id`. Financial-year
 * reporting for memberships is expressed through `reporting_period_id` (a reporting period itself
 * references a financial year). The form therefore exposes a Reporting Period picker, never an FY
 * picker — consuming the backend contract exactly.
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
 */

import type { MasterRef, HighlightType, PublicationState } from '@/types/common';

<<<<<<< HEAD
=======
/** Compact institution reference (memberships.dto.ts → InstitutionRef). */
export interface InstitutionRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}

/** Membership classification axes + status (memberships.types.ts). Stored lower-case (C7). */
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
export const MEMBERSHIP_LEVELS = ['sidhkofed', 'district_union'] as const;
export const MEMBERSHIP_TYPES = ['primary', 'nominal'] as const;
export const MEMBERSHIP_STATUSES = ['active', 'inactive'] as const;

export type MembershipLevel = (typeof MEMBERSHIP_LEVELS)[number];
export type MembershipType = (typeof MEMBERSHIP_TYPES)[number];
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

<<<<<<< HEAD
=======
/** Display labels for the membership enums (UI only — transport stays lower-case). */
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
export const MEMBERSHIP_LEVEL_LABEL: Record<MembershipLevel, string> = {
  sidhkofed: 'SIDHKOFED',
  district_union: 'District Union',
};
export const MEMBERSHIP_TYPE_LABEL: Record<MembershipType, string> = {
  primary: 'Primary',
  nominal: 'Nominal',
};
<<<<<<< HEAD

export interface InstitutionRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}

=======
export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

/** Admin list summary (MembershipSummaryDto). */
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
export interface MembershipSummary {
  id: string;
  slug: string;
  institution: InstitutionRef | null;
<<<<<<< HEAD
  membership_level: string;
  membership_type: string;
=======
  membership_level: MembershipLevel;
  membership_type: MembershipType;
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
  membership_number: string | null;
  district: MasterRef | null;
  district_union: InstitutionRef | null;
  reporting_period: MasterRef | null;
<<<<<<< HEAD
  status: string;
=======
  status: MembershipStatus;
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
  join_date: string | null;
  publication_state: PublicationState;
  public_visibility: boolean;
  show_on_homepage: boolean;
  highlight_type: HighlightType | null;
  display_order: number | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

<<<<<<< HEAD
=======
/** Admin detail (MembershipDetailDto) — adds internal notes + scheduling + authorship. */
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
export interface MembershipDetail extends MembershipSummary {
  notes_en: string | null;
  notes_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

<<<<<<< HEAD
/** Write payload — model-backed fields + workflow fields the backend validator accepts. */
=======
/**
 * Create/Update body — only the model-backed fields + allowed workflow fields the backend validator
 * accepts (memberships.validators.ts, `.strict()`). Server-managed fields (slug, state, *_by,
 * published_at) are never produced.
 */
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
export interface MembershipWriteInput {
  institution_id?: string;
  membership_level?: MembershipLevel;
  membership_type?: MembershipType;
  membership_number?: string | null;
  district_id?: string | null;
  district_union_id?: string | null;
  reporting_period_id?: string | null;
  status?: MembershipStatus;
  join_date?: string | null;
  notes_en?: string | null;
  notes_hi?: string | null;
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
  show_on_homepage?: boolean;
}
<<<<<<< HEAD
=======

/** One row of the bulk-upload payload (memberships.validators.ts → bulkRowShape; no workflow). */
export interface MembershipBulkRow {
  institution_id: string;
  membership_level: MembershipLevel;
  membership_type: MembershipType;
  membership_number?: string | null;
  district_id?: string | null;
  district_union_id?: string | null;
  reporting_period_id?: string | null;
  status?: MembershipStatus;
  join_date?: string | null;
  notes_en?: string | null;
  notes_hi?: string | null;
}

/** Bulk-upload transactional result (memberships.service.ts → BulkUploadResult). */
export interface MembershipBulkUploadResult {
  created_count: number;
  skipped_count: number;
  errors: Array<{ row: number; fields: Record<string, string[]> }>;
}
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
