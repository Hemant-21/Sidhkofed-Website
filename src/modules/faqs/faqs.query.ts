/**
 * Query-string parsing for FAQ list endpoints → framework-free filters + allow-listed ordering.
 * Unknown ordering → 422; unknown filter keys → 422 (API spec §1.4).
 *
 * Public filters (API spec §5): faq_category, search. The admin surface additionally accepts
 * publication_state and show_on_homepage.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import { FAQ_ORDERING_FIELDS, type FaqFilters, type FaqOrderingField } from './faqs.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

const PUBLIC_FILTER_KEYS = ['faq_category'] as const;
const ADMIN_FILTER_KEYS = [...PUBLIC_FILTER_KEYS, 'publication_state', 'show_on_homepage'] as const;

export function parseFaqFilters(req: Request, opts: { admin: boolean }): FaqFilters {
  const q = req.query;
  assertKnownQueryKeys(q, opts.admin ? ADMIN_FILTER_KEYS : PUBLIC_FILTER_KEYS);
  const filters: FaqFilters = {
    faqCategory: str(q.faq_category),
    search: str(q.search),
  };
  if (opts.admin) {
    filters.publicationState = parsePublicationState(q.publication_state);
    filters.showOnHomepage = parseBooleanFlag(q.show_on_homepage, 'show_on_homepage');
  }
  return filters;
}

const DEFAULT = { field: 'display_order' as FaqOrderingField, direction: 'asc' as const };

export function parseFaqOrdering(req: Request): { field: FaqOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, FAQ_ORDERING_FIELDS, DEFAULT);
  return { field: ob.field as FaqOrderingField, direction: ob.direction };
}
