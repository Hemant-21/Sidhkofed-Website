/**
 * Pure form ↔ API mapping for the membership form (unit-testable; no React). Converts the flat,
 * string-friendly form state into the typed `MembershipWriteInput` the backend accepts: empties
 * become null, highlight windows only sent when a highlight is active, ISO timestamps from calendar
 * dates. Server-managed fields (slug, state, *_by, published_at) are never produced.
 */

import type { HighlightType } from '@/types/common';
import type {
  MembershipDetail,
  MembershipLevel,
  MembershipStatus,
  MembershipType,
  MembershipWriteInput,
} from './types';

export interface MembershipFormValues {
  institution_id: string;
  membership_level: MembershipLevel;
  membership_type: MembershipType;
  membership_number: string;
  district_id: string;
  district_union_id: string;
  reporting_period_id: string;
  status: MembershipStatus;
  join_date: string;
  notes_en: string;
  notes_hi: string;
  // workflow
  public_visibility: boolean;
  show_on_homepage: boolean;
  highlight_type: string;
  highlight_start_at: string;
  highlight_end_at: string;
  display_order: string;
  publish_start_at: string;
}

const blank = (v: string): string | null => (v.trim() === '' ? null : v.trim());
const dateToIso = (v: string): string | null => (v ? `${v}T00:00:00.000Z` : null);

export function emptyMembershipForm(): MembershipFormValues {
  return {
    institution_id: '',
    membership_level: 'sidhkofed',
    membership_type: 'primary',
    membership_number: '',
    district_id: '',
    district_union_id: '',
    reporting_period_id: '',
    status: 'active',
    join_date: '',
    notes_en: '',
    notes_hi: '',
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

export function membershipToForm(m: MembershipDetail): MembershipFormValues {
  return {
    institution_id: m.institution?.id ?? '',
    membership_level: m.membership_level as MembershipLevel,
    membership_type: m.membership_type as MembershipType,
    membership_number: m.membership_number ?? '',
    district_id: m.district?.id ?? '',
    district_union_id: m.district_union?.id ?? '',
    reporting_period_id: m.reporting_period?.id ?? '',
    status: m.status as MembershipStatus,
    join_date: m.join_date ?? '',
    notes_en: m.notes_en ?? '',
    notes_hi: m.notes_hi ?? '',
    public_visibility: m.public_visibility,
    show_on_homepage: m.show_on_homepage,
    highlight_type: m.highlight_type ?? '',
    highlight_start_at: m.highlight_start_at ? m.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: m.highlight_end_at ? m.highlight_end_at.slice(0, 10) : '',
    display_order: m.display_order != null ? String(m.display_order) : '',
    publish_start_at: m.publish_start_at ? m.publish_start_at.slice(0, 10) : '',
  };
}

export function buildMembershipPayload(v: MembershipFormValues): MembershipWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  return {
    institution_id: v.institution_id,
    membership_level: v.membership_level,
    membership_type: v.membership_type,
    membership_number: blank(v.membership_number),
    district_id: blank(v.district_id),
    district_union_id: blank(v.district_union_id),
    reporting_period_id: blank(v.reporting_period_id),
    status: v.status,
    join_date: dateToIso(v.join_date),
    notes_en: blank(v.notes_en),
    notes_hi: blank(v.notes_hi),
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
