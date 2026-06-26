/**
 * Pure form ↔ API mapping for the gallery form (unit-testable; no React). Maps the flat form state to
 * `GalleryWriteInput`. Per the backend validator, `title_hi`/`description_*` are optional-but-NOT
 * nullable, so empties are sent as trimmed strings (allowing them to be cleared) rather than null;
 * `cover_media_id` IS nullable; `display_order` is omitted when blank. No server-managed fields.
 */

import type { GalleryDetail, GalleryWriteInput } from './types';

export interface GalleryFormValues {
  title_en: string;
  title_hi: string;
  description_en: string;
  description_hi: string;
  cover_media_id: string | null;
  public_visibility: boolean;
  show_on_homepage: boolean;
  display_order: string;
}

export function emptyGalleryForm(): GalleryFormValues {
  return {
    title_en: '',
    title_hi: '',
    description_en: '',
    description_hi: '',
    cover_media_id: null,
    public_visibility: false,
    show_on_homepage: false,
    display_order: '',
  };
}

export function galleryToForm(g: GalleryDetail): GalleryFormValues {
  return {
    title_en: g.title_en,
    title_hi: g.title_hi ?? '',
    description_en: g.description_en ?? '',
    description_hi: g.description_hi ?? '',
    cover_media_id: g.cover_media?.id ?? null,
    public_visibility: g.public_visibility,
    show_on_homepage: g.show_on_homepage,
    display_order: g.display_order != null ? String(g.display_order) : '',
  };
}

export function buildGalleryPayload(v: GalleryFormValues): GalleryWriteInput {
  const payload: GalleryWriteInput = {
    title_en: v.title_en.trim(),
    title_hi: v.title_hi.trim(),
    description_en: v.description_en.trim(),
    description_hi: v.description_hi.trim(),
    cover_media_id: v.cover_media_id ?? null,
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
  };
  if (v.display_order.trim() !== '') payload.display_order = Number(v.display_order);
  return payload;
}
