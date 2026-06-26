/**
 * Pure form ↔ API mapping for the video form (unit-testable; no React). Converts the flat,
 * string-friendly form state into the typed `VideoWriteInput` the backend accepts. The backend
 * validates/normalises the YouTube URL and extracts the id — the frontend only sends the raw URL.
 * Server-managed fields (slug, youtube_id, thumbnail_url, state) are never produced.
 */

import type { Video, VideoWriteInput } from './types';

export interface VideoFormValues {
  title_en: string;
  title_hi: string;
  description_en: string;
  description_hi: string;
  youtube_url: string;
  thumbnail_media_id: string | null;
  public_visibility: boolean;
  show_on_homepage: boolean;
  display_order: string;
}

const trimOrUndef = (v: string): string | undefined => (v.trim() === '' ? undefined : v.trim());

export function emptyVideoForm(): VideoFormValues {
  return {
    title_en: '',
    title_hi: '',
    description_en: '',
    description_hi: '',
    youtube_url: '',
    thumbnail_media_id: null,
    public_visibility: false,
    show_on_homepage: false,
    display_order: '',
  };
}

export function videoToForm(v: Video): VideoFormValues {
  return {
    title_en: v.title_en,
    title_hi: v.title_hi ?? '',
    description_en: v.description_en ?? '',
    description_hi: v.description_hi ?? '',
    youtube_url: v.youtube_url,
    thumbnail_media_id: v.thumbnail_media_id,
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    display_order: v.display_order != null ? String(v.display_order) : '',
  };
}

/**
 * Convert form values → the API write payload. Optional bilingual/description fields are omitted
 * when empty (the backend trims/normalises). `display_order` becomes a number or is omitted.
 */
export function buildVideoPayload(v: VideoFormValues): VideoWriteInput {
  const payload: VideoWriteInput = {
    title_en: v.title_en.trim(),
    title_hi: trimOrUndef(v.title_hi),
    description_en: trimOrUndef(v.description_en),
    description_hi: trimOrUndef(v.description_hi),
    youtube_url: v.youtube_url.trim(),
    thumbnail_media_id: v.thumbnail_media_id || null,
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
  };
  if (v.display_order.trim() !== '') payload.display_order = Number(v.display_order);
  return payload;
}
