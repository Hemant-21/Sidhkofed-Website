/**
 * Digital Services module types — mirror of the backend DTOs and validators
 * (digital-services.dto.ts / digital-services.validators.ts). Controlled links to APPROVED external
 * systems only (ERP, MIS, membership, beneficiary portal) — codex §4.14 / API spec §6. The CMS never
 * simulates, proxies, or embeds those systems; clients open `external_url` in a NEW TAB.
 *
 * Publishable **P** content carrying the publishing-workflow mixin, authorized with the shared
 * `content.*` RBAC keys. Server-managed fields (slug, state, *_by, published_at) are never produced.
 */

import type { MediaRef, HighlightType, PublicationState } from '@/types/common';

/** Admin list summary. */
export interface DigitalServiceSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  external_url: string;
  icon: MediaRef | null;
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

/** Admin detail — all fields including bilingual description. */
export interface DigitalServiceDetail extends DigitalServiceSummary {
  description_en: string | null;
  description_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Write payload — model-backed fields + workflow fields the backend validator accepts
 * (digital-services.validators.ts `createShape` + `workflowShape`). `external_url` is required and
 * must be HTTPS (validated client-side and re-validated server-side).
 */
export interface DigitalServiceWriteInput {
  title_en?: string;
  title_hi?: string | null;
  description_en?: string | null;
  description_hi?: string | null;
  external_url?: string;
  icon_media_id?: string | null;
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
  show_on_homepage?: boolean;
}
