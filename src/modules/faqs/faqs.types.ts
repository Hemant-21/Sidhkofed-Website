/**
 * FAQs module shared types — the framework-free filter/ordering contract used by the controller,
 * service, and repository. FAQs reuse the FAQ Category master (CMS requirements §4.13 / API spec §6).
 * No nested FAQs; public search covers question + answer; ordering follows category + display order.
 */
import type { PublicationState } from '@/shared/publishing';

/** Entity key used for the audit module name. */
export const FAQ_ENTITY = 'faq';

/** Admin/public list filters. All optional; the repository only reads known keys. */
export interface FaqFilters {
  publicationState?: PublicationState;
  faqCategory?: string; // id or slug
  showOnHomepage?: boolean;
  search?: string; // question + answer keyword
}

/** Allowed ordering fields. Public default follows category then display order (API spec §5). */
export const FAQ_ORDERING_FIELDS = [
  'display_order',
  'published_at',
  'created_at',
  'updated_at',
] as const;

export type FaqOrderingField = (typeof FAQ_ORDERING_FIELDS)[number];
