/**
 * Pure form ↔ API mapping for the institution form (unit-testable; no React). Converts the flat,
 * string-friendly form state into the typed `InstitutionWriteInput` the backend accepts: empties
 * become null, the highlight window is only sent with a highlight, and the publish window widens to
 * the ISO timestamp transport. Server-managed fields (slug, state, *_by) are never produced.
 */

import type { HighlightType } from '@/types/common';
import type { InstitutionDetail, InstitutionWriteInput } from './types';

export interface InstitutionFormValues {
  institution_type_id: string;
  name_en: string;
  name_hi: string;
  description_en: string;
  description_hi: string;
  address_en: string;
  address_hi: string;
  website_url: string;
  logo_media_id: string | null;
  district_id: string;
  contact_email: string;
  contact_phone: string;
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

/** Default (empty) form values for the create route. */
export function emptyInstitutionForm(): InstitutionFormValues {
  return {
    institution_type_id: '',
    name_en: '',
    name_hi: '',
    description_en: '',
    description_hi: '',
    address_en: '',
    address_hi: '',
    website_url: '',
    logo_media_id: null,
    district_id: '',
    contact_email: '',
    contact_phone: '',
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

/** Hydrate the form from an existing institution (edit route). */
export function institutionToForm(i: InstitutionDetail): InstitutionFormValues {
  return {
    institution_type_id: i.institution_type.id,
    name_en: i.name_en,
    name_hi: i.name_hi ?? '',
    description_en: i.description_en ?? '',
    description_hi: i.description_hi ?? '',
    address_en: i.address_en ?? '',
    address_hi: i.address_hi ?? '',
    website_url: i.website_url ?? '',
    logo_media_id: i.logo?.id ?? null,
    district_id: i.district?.id ?? '',
    contact_email: i.contact_email ?? '',
    contact_phone: i.contact_phone ?? '',
    public_visibility: i.public_visibility,
    show_on_homepage: i.show_on_homepage,
    highlight_type: i.highlight_type ?? '',
    highlight_start_at: i.highlight_start_at ? i.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: i.highlight_end_at ? i.highlight_end_at.slice(0, 10) : '',
    display_order: i.display_order != null ? String(i.display_order) : '',
    publish_start_at: i.publish_start_at ? i.publish_start_at.slice(0, 10) : '',
  };
}

/** Convert form values → the API write payload. Used for both create and PATCH. */
export function buildInstitutionPayload(v: InstitutionFormValues): InstitutionWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  return {
    institution_type_id: v.institution_type_id,
    name_en: v.name_en.trim(),
    name_hi: blank(v.name_hi),
    description_en: blank(v.description_en),
    description_hi: blank(v.description_hi),
    address_en: blank(v.address_en),
    address_hi: blank(v.address_hi),
    website_url: blank(v.website_url),
    logo_media_id: v.logo_media_id ?? null,
    district_id: blank(v.district_id),
    contact_email: blank(v.contact_email),
    contact_phone: blank(v.contact_phone),
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
