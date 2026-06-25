/**
 * Toolkits module shared types — framework-free filter/ordering contract. Reusable `Toolkit`
 * operation (CMS requirements §4.3 / API spec §5/§6): a Programme/Scheme + Commodity + ordered
 * ToolkitItems. Publishable **P** content carrying the publishing-workflow mixin.
 */
import type { PublicationState } from '@/shared/publishing';

export const TOOLKIT_ENTITY = 'toolkit';

export interface ToolkitFilters {
  publicationState?: PublicationState;
  commodity?: string; // id or slug
  programme?: string; // id or slug
  showOnHomepage?: boolean;
  search?: string;
}

/** Allowed ordering fields (API spec §5: `display_order,-published_at`). */
export const TOOLKIT_ORDERING_FIELDS = [
  'display_order',
  'published_at',
  'title_en',
  'created_at',
] as const;

export type ToolkitOrderingField = (typeof TOOLKIT_ORDERING_FIELDS)[number];
