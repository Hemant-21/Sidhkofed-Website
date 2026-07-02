/**
 * Programmes module shared types — framework-free filter/ordering contract. One reusable
 * ProgrammeScheme master-operation (CMS requirements §4.2 / API spec §5).
 */
import type { PublicationState } from '@/shared/publishing';

export const PROGRAMME_ENTITY = 'programme';

export interface ProgrammeFilters {
  publicationState?: PublicationState;
  commodity?: string; // id or slug
  showOnHomepage?: boolean;
  year?: number; // start_date year
  search?: string;
}

/** Allowed ordering fields (API spec §5: `display_order,-published_at,start_date`). */
export const PROGRAMME_ORDERING_FIELDS = [
  'display_order',
  'published_at',
  'start_date',
  'title_en',
  'created_at',
] as const;

export type ProgrammeOrderingField = (typeof PROGRAMME_ORDERING_FIELDS)[number];
