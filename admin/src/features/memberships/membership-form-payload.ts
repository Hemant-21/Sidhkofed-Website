/**
 * Pure form ↔ API mapping for the membership form (unit-testable; no React). Converts the flat,
 * string-friendly form state into the typed `MembershipWriteInput` the backend accepts: empties
<<<<<<< HEAD
 * become null, highlight windows only sent when a highlight is active, ISO timestamps from calendar
 * dates. Server-managed fields (slug, state, *_by, published_at) are never produced.
=======
 * become null, the highlight window is only sent with a highlight, calendar dates pass through as
 * `YYYY-MM-DD`, and the publish window widens to the ISO timestamp transport. Server-managed fields
 * (slug, state, *_by, published_at) are never produced.
 *
 * `district_union_id` is only meaningful when `membership_level=district_union`; the backend
 * requires it in that case and the form mirrors that rule client-side.
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
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
<<<<<<< HEAD
  membership_level: MembershipLevel;
  membership_type: MembershipType;
=======
  membership_level: MembershipLevel | '';
  membership_type: MembershipType | '';
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
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
<<<<<<< HEAD
const dateToIso = (v: string): string | null => (v ? `${v}T00:00:00.000Z` : null);

export function emptyMembershipForm(): MembershipFormValues {
  return {
    institution_id: '',
    membership_level: 'sidhkofed',
    membership_type: 'primary',
=======
const dateOnly = (v: string): string | null => (v ? v : null);
const dateToIso = (v: string): string | null => (v ? `${v}T00:00:00.000Z` : null);

/** Default (empty) form values for the create route. */
export function emptyMembershipForm(): MembershipFormValues {
  return {
    institution_id: '',
    membership_level: '',
    membership_type: '',
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
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

<<<<<<< HEAD
export function membershipToForm(m: MembershipDetail): MembershipFormValues {
  return {
    institution_id: m.institution?.id ?? '',
    membership_level: m.membership_level as MembershipLevel,
    membership_type: m.membership_type as MembershipType,
=======
/** Hydrate the form from an existing membership (edit route). */
export function membershipToForm(m: MembershipDetail): MembershipFormValues {
  return {
    institution_id: m.institution?.id ?? '',
    membership_level: m.membership_level,
    membership_type: m.membership_type,
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
    membership_number: m.membership_number ?? '',
    district_id: m.district?.id ?? '',
    district_union_id: m.district_union?.id ?? '',
    reporting_period_id: m.reporting_period?.id ?? '',
<<<<<<< HEAD
    status: m.status as MembershipStatus,
    join_date: m.join_date ?? '',
=======
    status: m.status,
    join_date: m.join_date ? m.join_date.slice(0, 10) : '',
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
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

<<<<<<< HEAD
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
=======
/** Convert form values → the API write payload. Used for both create and PATCH. */
export function buildMembershipPayload(v: MembershipFormValues): MembershipWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  const isDistrictUnion = v.membership_level === 'district_union';
  return {
    institution_id: v.institution_id,
    membership_level: v.membership_level === '' ? undefined : v.membership_level,
    membership_type: v.membership_type === '' ? undefined : v.membership_type,
    membership_number: blank(v.membership_number),
    district_id: blank(v.district_id),
    // Only carry a district union when the level calls for one (backend requires it then, ignores otherwise).
    district_union_id: isDistrictUnion ? blank(v.district_union_id) : null,
    reporting_period_id: blank(v.reporting_period_id),
    status: v.status,
    join_date: dateOnly(v.join_date),
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
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
