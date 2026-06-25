/**
 * Query-string parsing for digital-service list endpoints → framework-free filters + allow-listed
 * ordering. Unknown ordering → 422; unknown filter keys → 422 (API spec §1.4).
 *
 * The public surface (API spec §5) exposes a simple list with no public-specific filters; the admin
 * surface adds publication_state and show_on_homepage.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import {
  DIGITAL_SERVICE_ORDERING_FIELDS,
  type DigitalServiceFilters,
  type DigitalServiceOrderingField,
} from './digital-services.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

const PUBLIC_FILTER_KEYS = [] as const;
const ADMIN_FILTER_KEYS = ['publication_state', 'show_on_homepage'] as const;

export function parseDigitalServiceFilters(req: Request, opts: { admin: boolean }): DigitalServiceFilters {
  const q = req.query;
  assertKnownQueryKeys(q, opts.admin ? ADMIN_FILTER_KEYS : PUBLIC_FILTER_KEYS);
  const filters: DigitalServiceFilters = {
    search: str(q.search),
  };
  if (opts.admin) {
    filters.publicationState = parsePublicationState(q.publication_state);
    filters.showOnHomepage = parseBooleanFlag(q.show_on_homepage, 'show_on_homepage');
  }
  return filters;
}

const DEFAULT = { field: 'display_order' as DigitalServiceOrderingField, direction: 'asc' as const };

export function parseDigitalServiceOrdering(req: Request): {
  field: DigitalServiceOrderingField;
  direction: 'asc' | 'desc';
} {
  const ob = resolveOrdering(req.query.ordering, DIGITAL_SERVICE_ORDERING_FIELDS, DEFAULT);
  return { field: ob.field as DigitalServiceOrderingField, direction: ob.direction };
}
