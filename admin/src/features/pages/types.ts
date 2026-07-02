/**
 * Pages module types — mirror of the backend DTOs and validators (pages.dto.ts / pages.validators.ts).
 * One reusable operation for static/institutional pages (About Us, Vision, policies, …) — codex §4.10
 * / API spec §6. Layout stays code-controlled; the CMS owns page CONTENT + page-only SEO meta only.
 * No page builder / drag-and-drop / parent hierarchy / cover image (the backend does not accept them).
 *
 * Publishable **P** content carrying the publishing-workflow mixin, authorized with the shared
 * `content.*` RBAC keys. Canonical spellings follow foundation 01 (enums lower-case, dates
 * `YYYY-MM-DD`, timestamps ISO-8601 UTC). Server-managed fields (slug, state, *_by, published_at)
 * are never produced by the client.
 */

import type { HighlightType, PublicationState } from '@/types/common';

/** Admin list summary. */
export interface PageSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  publication_state: PublicationState;
  public_visibility: boolean;
  show_on_homepage: boolean;
  highlight_type: HighlightType | null;
  display_order: number | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Admin detail — all fields including body + SEO meta. */
export interface PageDetail extends PageSummary {
  body_en: string | null;
  body_hi: string | null;
  meta_title_en: string | null;
  meta_title_hi: string | null;
  meta_description_en: string | null;
  meta_description_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

/**
 * Write payload — model-backed fields + workflow fields the backend validator accepts
 * (pages.validators.ts `baseShape` + `workflowShape`). Nothing else.
 */
export interface PageWriteInput {
  title_en?: string;
  title_hi?: string | null;
  body_en?: string | null;
  body_hi?: string | null;
  meta_title_en?: string | null;
  meta_title_hi?: string | null;
  meta_description_en?: string | null;
  meta_description_hi?: string | null;
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
  show_on_homepage?: boolean;
}
