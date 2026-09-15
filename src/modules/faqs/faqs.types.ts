/**
 * FAQs module shared types — the framework-free filter/ordering contract used by the controller,
 * service, and repository. An FAQ may be assigned to zero or more registered main pages (see
 * faqs.pages.registry.ts), each with its own independent order; the central /faqs directory keeps
 * its own separate `display_order`. No nested FAQs; public search covers question + answer.
 */
import type { PublicationState } from '@/shared/publishing';

/** Entity key used for the audit module name. */
export const FAQ_ENTITY = 'faq';

/** Admin/public list filters. All optional; the repository only reads known keys. */
export interface FaqFilters {
  publicationState?: PublicationState;
  pageKey?: string; // registered FAQ page key
  search?: string; // question + answer keyword
}

/** Allowed ordering fields. Default follows the central directory's display order. */
export const FAQ_ORDERING_FIELDS = [
  'display_order',
  'published_at',
  'created_at',
  'updated_at',
] as const;

export type FaqOrderingField = (typeof FAQ_ORDERING_FIELDS)[number];
