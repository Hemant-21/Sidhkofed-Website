/**
 * Official Communications module types — mirror of the backend DTOs and validators.
 * One operation for notices, circulars, office orders, notifications, advisories, and
 * public announcements (codex §4.6 / API spec §6). Publishable **P** content carrying
 * the publishing-workflow mixin with `communications.*` RBAC keys.
 *
 * Canonical spellings follow the architecture-validation reconciliations (foundation 01):
 * enum values lower-case, dates `YYYY-MM-DD`, timestamps ISO-8601 UTC.
 */

import type { MasterRef, DocumentRef, HighlightType, PublicationState } from '@/types/common';

/** Admin list summary. */
export interface CommunicationSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  communication_type: MasterRef | null;
  reference_number: string | null;
  issue_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
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

/** Admin detail — all fields plus linked document. */
export interface CommunicationDetail extends CommunicationSummary {
  short_description_en: string | null;
  short_description_hi: string | null;
  document: DocumentRef | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  publish_start_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

/**
 * Write payload — model-backed fields + workflow fields the backend validator accepts.
 * Server-managed fields (slug, state, *_by, published_at) are never produced by the client.
 */
export interface CommunicationWriteInput {
  title_en?: string;
  title_hi?: string | null;
  communication_type_id?: string;
  reference_number?: string | null;
  issue_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  issuing_authority?: string | null;
  short_description_en?: string | null;
  short_description_hi?: string | null;
  document_id?: string | null;
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
  show_on_homepage?: boolean;
}
