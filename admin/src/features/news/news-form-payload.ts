/**
 * Pure form ↔ API mapping for the news edit form (unit-testable; no React). Empties become null,
 * the highlight window is only sent with a highlight, and dates are widened to ISO timestamps.
 * Produces a partial `NewsUpdateInput` (PATCH); `event_id` is never produced (immutable link).
 */

import type { HighlightType } from '@/types/common';
import type { NewsDetail, NewsUpdateInput } from './types';

export interface NewsFormValues {
  title_en: string;
  title_hi: string;
  summary_en: string;
  summary_hi: string;
  body_en: string;
  body_hi: string;
  cover_media_id: string | null;
  news_published_at: string;
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

export function newsToForm(n: NewsDetail): NewsFormValues {
  return {
    title_en: n.title_en,
    title_hi: n.title_hi ?? '',
    summary_en: n.summary_en ?? '',
    summary_hi: n.summary_hi ?? '',
    body_en: n.body_en ?? '',
    body_hi: n.body_hi ?? '',
    cover_media_id: n.cover_media?.id ?? null,
    news_published_at: n.news_published_at ? n.news_published_at.slice(0, 10) : '',
    public_visibility: n.public_visibility,
    show_on_homepage: n.show_on_homepage,
    highlight_type: n.highlight_type ?? '',
    highlight_start_at: n.highlight_start_at ? n.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: n.highlight_end_at ? n.highlight_end_at.slice(0, 10) : '',
    display_order: n.display_order != null ? String(n.display_order) : '',
    publish_start_at: n.publish_start_at ? n.publish_start_at.slice(0, 10) : '',
  };
}

export function buildNewsPayload(v: NewsFormValues): NewsUpdateInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  return {
    title_en: v.title_en.trim(),
    title_hi: blank(v.title_hi),
    summary_en: blank(v.summary_en),
    summary_hi: blank(v.summary_hi),
    body_en: blank(v.body_en),
    body_hi: blank(v.body_hi),
    cover_media_id: v.cover_media_id || null,
    news_published_at: dateToIso(v.news_published_at),
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
