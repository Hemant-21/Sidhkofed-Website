/**
 * Pure form ↔ API mapping for the toolkit form (unit-testable; no React). Converts the flat,
 * string-friendly form state into the typed `ToolkitWriteInput` the backend accepts: empties become
 * null, the highlight window is only sent with a highlight, and the publish window widens to the ISO
 * timestamp transport. Server-managed fields (slug, state, *_by) are never produced.
 */

import type { HighlightType } from '@/types/common';
import type { ToolkitDetail, ToolkitWriteInput } from './types';

export interface ToolkitFormValues {
  title_en: string;
  title_hi: string;
  summary_en: string;
  summary_hi: string;
  description_en: string;
  description_hi: string;
  programme_scheme_id: string;
  commodity_id: string;
  cover_media_id: string | null;
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
export function emptyToolkitForm(): ToolkitFormValues {
  return {
    title_en: '',
    title_hi: '',
    summary_en: '',
    summary_hi: '',
    description_en: '',
    description_hi: '',
    programme_scheme_id: '',
    commodity_id: '',
    cover_media_id: null,
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

/** Hydrate the form from an existing toolkit (edit route). */
export function toolkitToForm(t: ToolkitDetail): ToolkitFormValues {
  return {
    title_en: t.title_en,
    title_hi: t.title_hi ?? '',
    summary_en: t.summary_en ?? '',
    summary_hi: t.summary_hi ?? '',
    description_en: t.description_en ?? '',
    description_hi: t.description_hi ?? '',
    programme_scheme_id: t.programme?.id ?? '',
    commodity_id: t.commodity?.id ?? '',
    cover_media_id: t.cover_media?.id ?? null,
    public_visibility: t.public_visibility,
    show_on_homepage: t.show_on_homepage,
    highlight_type: t.highlight_type ?? '',
    highlight_start_at: t.highlight_start_at ? t.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: t.highlight_end_at ? t.highlight_end_at.slice(0, 10) : '',
    display_order: t.display_order != null ? String(t.display_order) : '',
    publish_start_at: t.publish_start_at ? t.publish_start_at.slice(0, 10) : '',
  };
}

/** Convert form values → the API write payload. Used for both create and PATCH. */
export function buildToolkitPayload(v: ToolkitFormValues): ToolkitWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  return {
    title_en: v.title_en.trim(),
    title_hi: blank(v.title_hi),
    summary_en: blank(v.summary_en),
    summary_hi: blank(v.summary_hi),
    description_en: blank(v.description_en),
    description_hi: blank(v.description_hi),
    programme_scheme_id: blank(v.programme_scheme_id),
    commodity_id: blank(v.commodity_id),
    cover_media_id: v.cover_media_id ?? null,
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
