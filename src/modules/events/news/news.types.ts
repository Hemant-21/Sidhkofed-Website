/**
 * Event News module shared types. News is DERIVED from events (CMS requirements §4.1) — a
 * completed event is manually re-published as news with its own editorial fields + lifecycle.
 * Not an independent content-entry operation.
 */
import type { PublicationState } from '@/shared/publishing';

export const NEWS_ENTITY = 'event_news';

export interface NewsFilters {
  publicationState?: PublicationState;
  event?: string; // event id or slug
  showOnHomepage?: boolean;
  year?: number; // news_published_at year
  search?: string;
}

/** Allowed ordering (API spec §5: `-news_published_at,-published_at,display_order`). */
export const NEWS_ORDERING_FIELDS = ['news_published_at', 'published_at', 'display_order', 'created_at'] as const;
export type NewsOrderingField = (typeof NEWS_ORDERING_FIELDS)[number];
