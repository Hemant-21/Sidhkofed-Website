/**
 * Pure form ↔ API mapping for the digital-service form (unit-testable; no React). Converts the flat,
 * string-friendly form state into the typed `DigitalServiceWriteInput` the backend accepts: empties
 * become null, highlights only sent when active, ISO timestamps from calendar dates. Server-managed
 * fields (slug, state, *_by, published_at) are never produced.
 */

import type { HighlightType } from '@/types/common';
import type { DigitalServiceDetail, DigitalServiceWriteInput } from './types';

export interface DigitalServiceFormValues {
  title_en: string;
  title_hi: string;
  description_en: string;
  description_hi: string;
  external_url: string;
  icon_media_id: string | null;
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

export function emptyDigitalServiceForm(): DigitalServiceFormValues {
  return {
    title_en: '',
    title_hi: '',
    description_en: '',
    description_hi: '',
    external_url: '',
    icon_media_id: null,
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

export function digitalServiceToForm(s: DigitalServiceDetail): DigitalServiceFormValues {
  return {
    title_en: s.title_en,
    title_hi: s.title_hi ?? '',
    description_en: s.description_en ?? '',
    description_hi: s.description_hi ?? '',
    external_url: s.external_url,
    icon_media_id: s.icon?.id ?? null,
    public_visibility: s.public_visibility,
    show_on_homepage: s.show_on_homepage,
    highlight_type: s.highlight_type ?? '',
    highlight_start_at: s.highlight_start_at ? s.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: s.highlight_end_at ? s.highlight_end_at.slice(0, 10) : '',
    display_order: s.display_order != null ? String(s.display_order) : '',
    publish_start_at: s.publish_start_at ? s.publish_start_at.slice(0, 10) : '',
  };
}

export function buildDigitalServicePayload(v: DigitalServiceFormValues): DigitalServiceWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  return {
    title_en: v.title_en.trim(),
    title_hi: blank(v.title_hi),
    description_en: blank(v.description_en),
    description_hi: blank(v.description_hi),
    external_url: v.external_url.trim(),
    icon_media_id: v.icon_media_id ?? null,
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
