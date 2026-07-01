/**
 * Procurement Updates module types — mirror of the backend DTOs and validators.
 * One operation for procurement rate, announcement, schedule, centre update, and trade
 * opportunity (codex §4.8). Frontend NEVER calculates rates, totals, or performs procurement
 * logic — it displays backend data only. No ERP, inventory, or warehouse logic.
 */

import type { MasterRef, DocumentRef, HighlightType, PublicationState } from '@/types/common';

/** Compact programme/scheme reference (content record — title-based; backend ProgrammeRef). */
export interface ProgrammeRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
}

/** Procurement update types as defined by backend master data. */
export interface ProcurementSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  procurement_update_type: MasterRef | null;
  commodity: MasterRef | null;
  district: MasterRef | null;
  block: MasterRef | null;
  rate: number | null;
  unit: string | null;
  quantity: number | null;
  display_quantity_as_mt: boolean;
  effective_date: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string | null;
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

export interface ProcurementDetail extends ProcurementSummary {
  location_text: string | null;
  summary_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  programme: ProgrammeRef | null;
  document: DocumentRef | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  publish_start_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

/**
 * Write payload. `rate` is a JSON number (DECIMAL(14,2) in the DB — the backend validator
 * accepts a number, not a string). Frontend NEVER calculates rates — it only passes what the
 * user enters, parsed to a number.
 */
export interface ProcurementWriteInput {
  title_en?: string;
  title_hi?: string | null;
  procurement_update_type_id?: string;
  commodity_id?: string | null;
  programme_scheme_id?: string | null;
  district_id?: string | null;
  block_id?: string | null;
  location_text?: string | null;
  rate?: number | null;
  unit?: string | null;
  quantity?: number | null;
  display_quantity_as_mt?: boolean;
  effective_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  summary_en?: string | null;
  summary_hi?: string | null;
  description_en?: string | null;
  description_hi?: string | null;
  status?: string | null;
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
