/**
 * Pure form ↔ API mapping for the page form (unit-testable; no React). Converts the flat,
 * string-friendly form state into the typed `PageWriteInput` the backend accepts: empties become
 * null, highlights only sent when active, ISO timestamps from calendar dates. Server-managed fields
 * (slug, state, *_by, published_at) are never produced.
 */

import type { HighlightType } from '@/types/common';
import type { PageDetail, PageWriteInput } from './types';

export interface PageFormValues {
  title_en: string;
  title_hi: string;
  body_en: string;
  body_hi: string;
  meta_title_en: string;
  meta_title_hi: string;
  meta_description_en: string;
  meta_description_hi: string;
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

export function emptyPageForm(): PageFormValues {
  return {
    title_en: '',
    title_hi: '',
    body_en: '',
    body_hi: '',
    meta_title_en: '',
    meta_title_hi: '',
    meta_description_en: '',
    meta_description_hi: '',
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

export function pageToForm(p: PageDetail): PageFormValues {
  return {
    title_en: p.title_en,
    title_hi: p.title_hi ?? '',
    body_en: p.body_en ?? '',
    body_hi: p.body_hi ?? '',
    meta_title_en: p.meta_title_en ?? '',
    meta_title_hi: p.meta_title_hi ?? '',
    meta_description_en: p.meta_description_en ?? '',
    meta_description_hi: p.meta_description_hi ?? '',
    public_visibility: p.public_visibility,
    show_on_homepage: p.show_on_homepage,
    highlight_type: p.highlight_type ?? '',
    highlight_start_at: p.highlight_start_at ? p.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: p.highlight_end_at ? p.highlight_end_at.slice(0, 10) : '',
    display_order: p.display_order != null ? String(p.display_order) : '',
    publish_start_at: p.publish_start_at ? p.publish_start_at.slice(0, 10) : '',
  };
}

export function buildPagePayload(v: PageFormValues): PageWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  return {
    title_en: v.title_en.trim(),
    title_hi: blank(v.title_hi),
    body_en: blank(v.body_en),
    body_hi: blank(v.body_hi),
    meta_title_en: blank(v.meta_title_en),
    meta_title_hi: blank(v.meta_title_hi),
    meta_description_en: blank(v.meta_description_en),
    meta_description_hi: blank(v.meta_description_hi),
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
