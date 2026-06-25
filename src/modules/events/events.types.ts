/**
 * Events module shared types — framework-free filter/ordering contract. One Events operation for
 * all institutional activities (CMS requirements §4.1 / API spec §5/§6).
 */
import type { PublicationState } from '@/shared/publishing';
import type { EventStatus } from '@prisma/client';

export const EVENT_ENTITY = 'event';

export interface EventFilters {
  publicationState?: PublicationState;
  eventType?: string; // id or slug
  eventStatus?: EventStatus;
  district?: string; // id or slug
  block?: string; // id or slug
  commodity?: string; // id or slug
  programme?: string; // id or slug
  institution?: string; // id or slug
  showOnHomepage?: boolean;
  year?: number; // start_date year
  dateFrom?: Date; // start_date >=
  dateTo?: Date; // start_date <=
  search?: string;
}

/** Allowed ordering fields (API spec §5: `start_date,-start_date,-published_at,display_order`). */
export const EVENT_ORDERING_FIELDS = ['start_date', 'published_at', 'display_order', 'created_at'] as const;
export type EventOrderingField = (typeof EVENT_ORDERING_FIELDS)[number];
