/**
 * Tender Management module types — mirror of the backend DTOs and validators.
 * Tender Management stores only lightweight structured information plus a GeM link (codex §4.7).
 * Frontend is INFORMATIONAL only — no bid submission, no procurement workflow, no GeM embedding.
 * External GeM links open securely with target="_blank" rel="noopener noreferrer".
 *
 * Canonical spelling: `publish_date` (not `publishing_date` — arch-val reconciliation C5).
 * Tender status: `open | closed | cancelled | awarded` (API spec §6, backend enum).
 */

import type { MasterRef, HighlightType, PublicationState } from '@/types/common';

/** Tender status as stored/transported. */
export type TenderStatus = 'open' | 'closed' | 'cancelled' | 'awarded';

/** Admin list summary. */
export interface TenderSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  tender_type: MasterRef | null;
  tender_number: string | null;
  publish_date: string | null;
  submission_deadline: string | null;
  opening_date: string | null;
  tender_status: TenderStatus | null;
  gem_url: string | null;
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

/** Admin detail. */
export interface TenderDetail extends TenderSummary {
  summary_hi: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  publish_start_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

/**
 * Write payload — model-backed fields + workflow fields. Server-managed fields never produced.
 * GeM URL must be a valid HTTPS URL (backend validates). Do not proxy or embed the GeM site.
 */
export interface TenderWriteInput {
  title_en?: string;
  title_hi?: string | null;
  tender_type_id?: string;
  tender_number?: string | null;
  publish_date?: string | null;
  submission_deadline?: string | null;
  opening_date?: string | null;
  tender_status?: TenderStatus | null;
  summary_en?: string | null;
  summary_hi?: string | null;
  gem_url?: string | null;
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
  show_on_homepage?: boolean;
}
