/**
 * Query-string parsing for FAQ list endpoints → framework-free filters + allow-listed ordering.
 * Unknown ordering → 422; unknown filter keys → 422 (API spec §1.4).
 *
 * Public filters: `page_key` (a registered FAQ page; unknown key → 422, never unfiltered) and
 * `search`. The admin surface additionally accepts `publication_state`. When `page_key` is absent
 * the (public or admin) listing falls back to the global /faqs directory ordering.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, assertKnownQueryKeys } from '@/shared/list-query';
import { ValidationError } from '@/shared/errors';
import { isRegisteredFaqPageKey } from './faqs.pages.registry';
import { FAQ_ORDERING_FIELDS, type FaqFilters, type FaqOrderingField } from './faqs.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

const PUBLIC_FILTER_KEYS = ['page_key', 'search'] as const;
const ADMIN_FILTER_KEYS = [...PUBLIC_FILTER_KEYS, 'publication_state'] as const;

function parsePageKey(v: unknown): string | undefined {
  const key = str(v);
  if (key === undefined) return undefined;
  if (!isRegisteredFaqPageKey(key)) throw new ValidationError({ page_key: ['Unknown page key.'] });
  return key;
}

export function parseFaqFilters(req: Request, opts: { admin: boolean }): FaqFilters {
  const q = req.query;
  assertKnownQueryKeys(q, opts.admin ? ADMIN_FILTER_KEYS : PUBLIC_FILTER_KEYS);
  const filters: FaqFilters = {
    pageKey: parsePageKey(q.page_key),
    search: str(q.search),
  };
  if (opts.admin) {
    filters.publicationState = parsePublicationState(q.publication_state);
  }
  return filters;
}

const DEFAULT = { field: 'display_order' as FaqOrderingField, direction: 'asc' as const };

export function parseFaqOrdering(req: Request): { field: FaqOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, FAQ_ORDERING_FIELDS, DEFAULT);
  return { field: ob.field as FaqOrderingField, direction: ob.direction };
}
