/**
 * Query-string parsing for leadership list endpoints → framework-free filters + allow-listed
 * ordering. Unknown ordering → 422; unknown filter keys → 422 (API spec §1.4).
 *
 * The public surface exposes a simple list with no public-specific filters; the admin surface adds
 * publication_state.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, assertKnownQueryKeys } from '@/shared/list-query';
import {
  LEADERSHIP_ORDERING_FIELDS,
  type LeadershipFilters,
  type LeadershipOrderingField,
} from './leadership.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

const PUBLIC_FILTER_KEYS = [] as const;
const ADMIN_FILTER_KEYS = ['publication_state'] as const;

export function parseLeadershipFilters(req: Request, opts: { admin: boolean }): LeadershipFilters {
  const q = req.query;
  assertKnownQueryKeys(q, opts.admin ? ADMIN_FILTER_KEYS : PUBLIC_FILTER_KEYS);
  const filters: LeadershipFilters = {
    search: str(q.search),
  };
  if (opts.admin) {
    filters.publicationState = parsePublicationState(q.publication_state);
  }
  return filters;
}

const DEFAULT = { field: 'display_order' as LeadershipOrderingField, direction: 'asc' as const };

export function parseLeadershipOrdering(req: Request): {
  field: LeadershipOrderingField;
  direction: 'asc' | 'desc';
} {
  const ob = resolveOrdering(req.query.ordering, LEADERSHIP_ORDERING_FIELDS, DEFAULT);
  return { field: ob.field as LeadershipOrderingField, direction: ob.direction };
}
