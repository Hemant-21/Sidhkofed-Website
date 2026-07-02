/**
 * Event News types — faithful mirror of the backend News DTOs (news.dto.ts) and validators
 * (news.validators.ts). News is a DERIVED record: it is created only via the event's
 * publish-as-news action and stays linked to its source event (the link is immutable). The admin
 * surface here manages the news record's own editorial fields + lifecycle.
 */

import type { MediaRef, PublicationState, HighlightType } from '@/types/common';

export interface NewsSourceEvent {
  id: string;
  slug: string;
  title_en: string;
  event_type: string;
  public_url: string;
}

/** Admin list summary (NewsSummaryDto). */
export interface NewsSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  cover_media: MediaRef | null;
  news_published_at: string | null;
  source_event: NewsSourceEvent;
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

/** Admin detail (NewsDetailDto). */
export interface NewsDetail extends NewsSummary {
  summary_hi: string | null;
  body_en: string | null;
  body_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

/** PATCH /admin/news/{id} — editable editorial + workflow fields (event_id is never client-set). */
export interface NewsUpdateInput {
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
