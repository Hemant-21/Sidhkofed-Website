/**
 * Memberships module types — mirror of the backend DTOs/validators (memberships.dto.ts /
 * memberships.validators.ts). Institutional Membership is a publishable **P** content resource
 * carrying the workflow mixin, authorized with the shared `content.*` RBAC keys. `institution_id`,
 * `membership_level`, and `membership_type` are required; everything else is optional.
 */

import type { MasterRef, HighlightType, PublicationState } from '@/types/common';

export const MEMBERSHIP_LEVELS = ['sidhkofed', 'district_union'] as const;
export const MEMBERSHIP_TYPES = ['primary', 'nominal'] as const;
export const MEMBERSHIP_STATUSES = ['active', 'inactive'] as const;

export type MembershipLevel = (typeof MEMBERSHIP_LEVELS)[number];
export type MembershipType = (typeof MEMBERSHIP_TYPES)[number];
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const MEMBERSHIP_LEVEL_LABEL: Record<MembershipLevel, string> = {
  sidhkofed: 'SIDHKOFED',
  district_union: 'District Union',
};
export const MEMBERSHIP_TYPE_LABEL: Record<MembershipType, string> = {
  primary: 'Primary',
  nominal: 'Nominal',
};

export interface InstitutionRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}

export interface MembershipSummary {
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

export interface MembershipDetail extends MembershipSummary {
  notes_en: string | null;
  notes_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

/** Write payload — model-backed fields + workflow fields the backend validator accepts. */
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
