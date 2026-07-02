/**
 * Query-string parsing for toolkit list endpoints → framework-free `ToolkitFilters` +
 * allow-listed ordering.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, parseBooleanFlag, parseSearch, assertKnownQueryKeys } from '@/shared/list-query';
import { TOOLKIT_ORDERING_FIELDS, type ToolkitFilters, type ToolkitOrderingField } from './toolkits.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

// Allow-listed filter keys (API spec §6: toolkit filters commodity, programme). `publication_state`
// is admin-only. Plus the common page/page_size/ordering/search keys.
const PUBLIC_FILTER_KEYS = ['commodity', 'programme', 'show_on_homepage'] as const;
const ADMIN_FILTER_KEYS = [...PUBLIC_FILTER_KEYS, 'publication_state'] as const;

export function parseToolkitFilters(req: Request, opts: { admin: boolean }): ToolkitFilters {
  const q = req.query;
  assertKnownQueryKeys(q, opts.admin ? ADMIN_FILTER_KEYS : PUBLIC_FILTER_KEYS);
  const filters: ToolkitFilters = {
    commodity: str(q.commodity),
    programme: str(q.programme),
    showOnHomepage: parseBooleanFlag(q.show_on_homepage, 'show_on_homepage'),
    search: parseSearch(q.search),
  };
  if (opts.admin) filters.publicationState = parsePublicationState(q.publication_state);
  return filters;
}

const ADMIN_DEFAULT = { field: 'created_at' as ToolkitOrderingField, direction: 'desc' as const };
const PUBLIC_DEFAULT = { field: 'display_order' as ToolkitOrderingField, direction: 'asc' as const };

export function parseToolkitOrdering(
  req: Request,
  admin: boolean,
): { field: ToolkitOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, TOOLKIT_ORDERING_FIELDS, admin ? ADMIN_DEFAULT : PUBLIC_DEFAULT);
  return { field: ob.field as ToolkitOrderingField, direction: ob.direction };
}
