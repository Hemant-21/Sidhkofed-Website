/**
 * Pure form ↔ API mapping for the leadership form (unit-testable; no React). Converts the flat,
 * string-friendly form state into the typed `LeadershipWriteInput` the backend accepts: empties
 * become null, highlights only sent when active, ISO timestamps from calendar dates. Server-managed
 * fields (slug, state, *_by, published_at) are never produced.
 */

import type { HighlightType } from '@/types/common';
import type { LeadershipDetail, LeadershipWriteInput } from './types';

export interface LeadershipFormValues {
  name_en: string;
  name_hi: string;
  govt_role_en: string;
  govt_role_hi: string;
  sidhkofed_role_en: string;
  sidhkofed_role_hi: string;
  photo_media_id: string | null;
  // workflow
  public_visibility: boolean;
  highlight_type: string;
  highlight_start_at: string;
  highlight_end_at: string;
  display_order: string;
  publish_start_at: string;
}

const blank = (v: string): string | null => (v.trim() === '' ? null : v.trim());
const dateToIso = (v: string): string | null => (v ? `${v}T00:00:00.000Z` : null);

export function emptyLeadershipForm(): LeadershipFormValues {
  return {
    name_en: '',
    name_hi: '',
    govt_role_en: '',
    govt_role_hi: '',
    sidhkofed_role_en: '',
    sidhkofed_role_hi: '',
    photo_media_id: null,
    public_visibility: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

export function leadershipToForm(s: LeadershipDetail): LeadershipFormValues {
  return {
    name_en: s.name_en,
    name_hi: s.name_hi ?? '',
    govt_role_en: s.govt_role_en,
    govt_role_hi: s.govt_role_hi ?? '',
    sidhkofed_role_en: s.sidhkofed_role_en,
    sidhkofed_role_hi: s.sidhkofed_role_hi ?? '',
    photo_media_id: s.photo?.id ?? null,
    public_visibility: s.public_visibility,
    highlight_type: s.highlight_type ?? '',
    highlight_start_at: s.highlight_start_at ? s.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: s.highlight_end_at ? s.highlight_end_at.slice(0, 10) : '',
    display_order: s.display_order != null ? String(s.display_order) : '',
    publish_start_at: s.publish_start_at ? s.publish_start_at.slice(0, 10) : '',
  };
}

export function buildLeadershipPayload(v: LeadershipFormValues): LeadershipWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  return {
    name_en: v.name_en.trim(),
    name_hi: blank(v.name_hi),
    govt_role_en: v.govt_role_en.trim(),
    govt_role_hi: blank(v.govt_role_hi),
    sidhkofed_role_en: v.sidhkofed_role_en.trim(),
    sidhkofed_role_hi: blank(v.sidhkofed_role_hi),
    photo_media_id: v.photo_media_id ?? null,
    public_visibility: v.public_visibility,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
