/**
 * Video Library types — a faithful mirror of the backend Video DTO (video.dto.ts) and validators
 * (video.validators.ts). Videos are YouTube references (codex §5.3) — never hosted files. The
 * backend list and detail return the SAME shape (VideoDto), so summary === detail here.
 *
 * NOTE (match the backend, not the broader spec prose): the running backend has NO `language`,
 * `highlight_type`, `publish_start_at`, or `duration` on videos — the YouTube embed supplies
 * duration at play time. We model exactly what the API returns/accepts.
 */

import type { PublicationState } from '@/types/common';

/** Video record (video.dto.ts → VideoDto). Summary and detail are identical. */
export interface Video {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  youtube_id: string;
  youtube_url: string;
  thumbnail_url: string;
  thumbnail_media_id: string | null;
  publication_state: PublicationState;
  public_visibility: boolean;
  show_on_homepage: boolean;
  display_order: number | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Create/Update body — exactly the fields video.validators.ts accepts. */
export interface VideoWriteInput {
  title_en?: string;
  title_hi?: string;
  description_en?: string;
  description_hi?: string;
  youtube_url?: string;
  thumbnail_media_id?: string | null;
  public_visibility?: boolean;
  show_on_homepage?: boolean;
  display_order?: number;
}

/** Response of POST /admin/videos/validate-url (video.controller.ts → validateUrl). */
export interface YouTubeValidation {
  valid: boolean;
  youtube_id: string;
  canonical_url: string;
  thumbnail_url: string;
}
