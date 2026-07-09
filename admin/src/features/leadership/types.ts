/**
 * Leadership module types — mirror of the backend DTOs and validators
 * (leadership.dto.ts / leadership.validators.ts). Publishable **P** content carrying the
 * publishing-workflow mixin, authorized with the shared `content.*` RBAC keys. Server-managed
 * fields (slug, state, *_by, published_at) are never produced.
 *
 * Unlike Digital Services, there is no `external_url` and no `show_on_homepage` — every
 * leadership record is implicitly homepage content (there's no separate public listing page).
 */

import type { MediaRef, HighlightType, PublicationState } from '@/types/common';

/** Admin list summary. */
export interface LeadershipSummary {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  govt_role_en: string;
  govt_role_hi: string | null;
  sidhkofed_role_en: string;
  sidhkofed_role_hi: string | null;
  photo: MediaRef | null;
  publication_state: PublicationState;
  public_visibility: boolean;
  highlight_type: HighlightType | null;
  display_order: number | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Admin detail — all fields. */
export interface LeadershipDetail extends LeadershipSummary {
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Write payload — model-backed fields + workflow fields the backend validator accepts
 * (leadership.validators.ts `createShape` + `workflowShape`).
 */
export interface LeadershipWriteInput {
  name_en?: string;
  name_hi?: string | null;
  govt_role_en?: string;
  govt_role_hi?: string | null;
  sidhkofed_role_en?: string;
  sidhkofed_role_hi?: string | null;
  photo_media_id?: string | null;
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
}
