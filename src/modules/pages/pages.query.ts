/**
 * Query-string parsing for the page admin list endpoint → framework-free filters + allow-listed
 * ordering. Unknown ordering → 422; unknown filter keys → 422 (API spec §1.4).
 *
 * Pages have no public list (API spec §5 only exposes `GET /public/pages/{slug}`), so only the admin
 * surface parses filters here.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import { PAGE_ORDERING_FIELDS, type PageFilters, type PageOrderingField } from './pages.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

const ADMIN_FILTER_KEYS = ['publication_state', 'show_on_homepage'] as const;

export function parsePageFilters(req: Request): PageFilters {
  const q = req.query;
  assertKnownQueryKeys(q, ADMIN_FILTER_KEYS);
  return {
    publicationState: parsePublicationState(q.publication_state),
    showOnHomepage: parseBooleanFlag(q.show_on_homepage, 'show_on_homepage'),
    search: str(q.search),
  };
}

const DEFAULT = { field: 'display_order' as PageOrderingField, direction: 'asc' as const };

export function parsePageOrdering(req: Request): { field: PageOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, PAGE_ORDERING_FIELDS, DEFAULT);
  return { field: ob.field as PageOrderingField, direction: ob.direction };
}
