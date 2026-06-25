/**
 * Institutions module shared types — the framework-free filter/ordering contract used by the
 * controller, service, and repository (mirrors documents.types.ts). One reusable Institution
 * operation for all organisations (CMS requirements §4.4 / API spec §5).
 */
import type { PublicationState } from '@/shared/publishing';

/** Entity key used for media-usage tracking + audit module name. */
export const INSTITUTION_ENTITY = 'institution';

/** Admin/public list filters. All optional; the repository only reads known keys. */
export interface InstitutionFilters {
  publicationState?: PublicationState;
  institutionType?: string; // id or slug
  district?: string; // id or slug
  showOnHomepage?: boolean;
  search?: string; // metadata keyword (name/description)
}

/** Allowed ordering fields for institution lists (API spec §5: `display_order,name_en`). */
export const INSTITUTION_ORDERING_FIELDS = [
  'display_order',
  'name_en',
  'published_at',
  'created_at',
] as const;

export type InstitutionOrderingField = (typeof INSTITUTION_ORDERING_FIELDS)[number];
