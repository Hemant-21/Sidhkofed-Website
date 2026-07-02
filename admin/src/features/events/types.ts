/**
 * Events module types — a faithful mirror of the backend Event DTOs (events.dto.ts) and request
 * validators (events.validators.ts). The frontend consumes these contracts exactly; it never
 * invents fields or derives status. `snake_case` matches the API transport (API spec §0).
 */

import type { MasterRef, MediaRef, PublicationState, HighlightType } from '@/types/common';

/** Auto-derived (scheduled/ongoing/completed) or manual override (postponed/cancelled). Read-only. */
export type EventStatus = 'scheduled' | 'ongoing' | 'completed' | 'postponed' | 'cancelled';

export type DateMode = 'single' | 'range' | 'multi_day';

/** Backend dynamic-field data types (events.dynamic-fields.ts) — exactly these six. */
export type FieldDataType = 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select';

/** One active controlled field for an event type (GET /admin/event-types/{id}/field-definitions). */
export interface EventFieldDefinition {
  id: string;
  event_type_id: string;
  field_key: string;
  label_en: string;
  label_hi: string | null;
  data_type: FieldDataType;
  is_required: boolean;
  options: string[] | null;
  display_order: number;
  is_active: boolean;
}

// ── Compact link refs (as returned in event detail) ─────────────────────────────
export interface EventDocumentLink {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  document_type: string;
  file_url: string;
  language: string;
}
export interface EventGalleryLink {
  id: string;
  slug: string;
  title_en: string;
  cover_media: MediaRef | null;
  image_count: number;
}
export interface EventNewsLink {
  id: string;
  slug: string;
  title_en: string;
  publication_state: PublicationState;
  news_published_at: string | null;
  public_url: string;
}
export interface ProgrammeRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  short_code: string | null;
}
export interface InstitutionRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}

/** Admin list summary (lightweight — EventSummaryDto). */
export interface EventSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  event_type: MasterRef;
  event_status: EventStatus;
  date_mode: DateMode;
  start_date: string;
  end_date: string | null;
  location_text: string | null;
  district: MasterRef | null;
  cover_media: MediaRef | null;
  highlight_type: HighlightType | null;
  display_order: number | null;
  show_on_homepage: boolean;
  publication_state: PublicationState;
  public_visibility: boolean;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Admin detail (full — EventDetailDto). */
export interface EventDetail extends EventSummary {
  summary_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  training_type: MasterRef | null;
  block: MasterRef | null;
  status_override: boolean;
  cancellation_reason: string | null;
  revised_start_date: string | null;
  dynamic_values: Record<string, unknown>;
  outcome_summary_en: string | null;
  outcome_summary_hi: string | null;
  key_highlights: string | null;
  final_participant_count: number | null;
  participant_male_count: number | null;
  participant_female_count: number | null;
  participant_other_count: number | null;
  completion_remarks_en: string | null;
  completion_remarks_hi: string | null;
  completed_date: string | null;
  translation_source: string;
  commodities: MasterRef[];
  programmes: ProgrammeRef[];
  institutions: InstitutionRef[];
  documents: EventDocumentLink[];
  galleries: EventGalleryLink[];
  news: EventNewsLink[];
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

// ── Request payloads (events.validators.ts) ─────────────────────────────────────
/** Create/Update body — only model-backed fields + relation arrays + workflow fields. */
export interface EventWriteInput {
  event_type_id?: string;
  training_type_id?: string | null;
  title_en?: string;
  title_hi?: string | null;
  summary_en?: string | null;
  summary_hi?: string | null;
  description_en?: string | null;
  description_hi?: string | null;
  date_mode?: DateMode;
  start_date?: string;
  end_date?: string | null;
  location_text?: string | null;
  district_id?: string | null;
  block_id?: string | null;
  cover_media_id?: string | null;
  commodity_ids?: string[];
  programme_ids?: string[];
  institution_ids?: string[];
  document_ids?: string[];
  gallery_ids?: string[];
  dynamic_values?: Record<string, unknown> | null;
  status_override?: boolean;
  event_status?: 'postponed' | 'cancelled';
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  show_on_homepage?: boolean;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
}

/** POST /admin/events/{id}/complete. */
export interface EventCompleteInput {
  outcome_summary_en?: string | null;
  outcome_summary_hi?: string | null;
  key_highlights?: string | null;
  final_participant_count?: number | null;
  participant_male_count?: number | null;
  participant_female_count?: number | null;
  participant_other_count?: number | null;
  completion_remarks_en?: string | null;
  completion_remarks_hi?: string | null;
  completed_date?: string | null;
  gallery_ids?: string[];
  document_ids?: string[];
}

/** POST /admin/events/{id}/cancel. */
export interface EventCancelInput {
  cancellation_reason?: string | null;
  revised_start_date?: string | null;
}

/** POST /admin/events/{id}/publish-as-news — all optional overrides. */
export interface PublishAsNewsInput {
  title_en?: string;
  title_hi?: string | null;
  summary_en?: string | null;
  summary_hi?: string | null;
  body_en?: string | null;
  body_hi?: string | null;
  cover_media_id?: string | null;
  news_published_at?: string | null;
  public_visibility?: boolean;
  publish_start_at?: string | null;
  show_on_homepage?: boolean;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
}
