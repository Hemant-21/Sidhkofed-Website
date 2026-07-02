/**
 * Pages module shared types — the framework-free filter/ordering contract used by the controller,
 * service, and repository. One reusable operation for static/institutional pages (About Us, Vision,
 * policies, …) — CMS requirements §4.10 / API spec §6. Layout stays code-controlled; the CMS owns
 * page CONTENT + page-only SEO meta only. No page builder / drag-and-drop.
 */
import type { PublicationState } from '@/shared/publishing';

/** Entity key used for the audit module name. */
export const PAGE_ENTITY = 'page';

/** Admin list filters. All optional; the repository only reads known keys. */
export interface PageFilters {
  publicationState?: PublicationState;
  showOnHomepage?: boolean;
  search?: string; // metadata keyword (title/body)
}

/** Allowed ordering fields (admin list). */
export const PAGE_ORDERING_FIELDS = [
  'display_order',
  'title_en',
  'published_at',
  'created_at',
  'updated_at',
] as const;

export type PageOrderingField = (typeof PAGE_ORDERING_FIELDS)[number];
