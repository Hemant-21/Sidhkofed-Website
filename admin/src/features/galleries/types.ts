/**
 * Galleries module types — mirror of the backend DTOs and validators (gallery.dto.ts /
 * gallery.validators.ts). A photo gallery is a publishable **P** record that references reusable
 * Media Library assets (codex §5.2 / API spec §6); images are never copied. Authorized with the
 * shared `content.*` RBAC keys (reads are role-based).
 *
 * NOTE the gallery contract is intentionally simpler than other content modules: it has NO highlight
 * fields and NO scheduled-publish field — only cover, visibility, homepage, and display order.
 * Server-managed fields (slug, state, *_by, published_at) are never produced by the client.
 */

import type { MediaRef, PublicationState } from '@/types/common';

/** One image inside a gallery (gallery image row, not the bare media asset). */
export interface GalleryImage {
  id: string;
  media: MediaRef;
  display_order: number;
  caption_en: string | null;
  caption_hi: string | null;
}

/** Admin list summary — lightweight: cover + image_count, no `images` array (gallery.dto.ts Issue 11). */
export interface GallerySummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  cover_media: MediaRef | null;
  publication_state: PublicationState;
  public_visibility: boolean;
  show_on_homepage: boolean;
  display_order: number | null;
  image_count: number;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Admin detail — full record including the ordered `images` array. */
export interface GalleryDetail extends GallerySummary {
  images: GalleryImage[];
}

/**
 * Write payload — model-backed fields the backend validator accepts (gallery.validators.ts).
 * `title_hi`/`description_*` are optional-but-NOT-nullable on the backend, so the client sends a
 * (possibly empty) string rather than null; `cover_media_id` IS nullable; `display_order` is omitted
 * when blank (an optional int, not nullable).
 */
export interface GalleryWriteInput {
  title_en?: string;
  title_hi?: string;
  description_en?: string;
  description_hi?: string;
  cover_media_id?: string | null;
  public_visibility?: boolean;
  show_on_homepage?: boolean;
  display_order?: number;
}

/** Add-image payload (POST /admin/galleries/:id/images). */
export interface GalleryImageInput {
  media_id: string;
  display_order?: number;
  caption_en?: string;
  caption_hi?: string;
}

/** Update-image payload (PATCH /admin/galleries/:id/images/:imageId). */
export interface GalleryImageUpdateInput {
  display_order?: number;
  caption_en?: string | null;
  caption_hi?: string | null;
}

/** Reorder payload (POST /admin/galleries/:id/images/reorder) — note the key is `order`. */
export interface GalleryReorderInput {
  order: Array<{ id: string; display_order: number }>;
}
