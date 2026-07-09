/**
 * Leadership module shared types — the framework-free filter/ordering contract used by the
 * controller, service, and repository. Leadership entries are the org's public leadership roster
 * (Government role + SIDHKOFED role, optional photo) shown on the public homepage. Unlike Digital
 * Services, Leadership has no separate listing page and no homepage-featured subset — the public
 * endpoint's full list IS the homepage feed, so there is deliberately no `showOnHomepage` field.
 */
import type { PublicationState } from '@/shared/publishing';

/** Entity key used for the audit module name and media-usage entityType. */
export const LEADERSHIP_ENTITY = 'leadership';

/** Admin/public list filters. All optional; the repository only reads known keys. */
export interface LeadershipFilters {
  publicationState?: PublicationState;
  search?: string; // name/role keyword
}

/** Allowed ordering fields (default display order). */
export const LEADERSHIP_ORDERING_FIELDS = [
  'display_order',
  'name_en',
  'published_at',
  'created_at',
  'updated_at',
] as const;

export type LeadershipOrderingField = (typeof LEADERSHIP_ORDERING_FIELDS)[number];
