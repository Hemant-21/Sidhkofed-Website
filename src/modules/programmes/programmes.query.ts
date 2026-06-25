/**
 * Query-string parsing for programme list endpoints → framework-free `ProgrammeFilters` +
 * allow-listed ordering.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { ValidationError } from '@/shared/errors';
import { parsePublicationState, parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import { PROGRAMME_ORDERING_FIELDS, type ProgrammeFilters, type ProgrammeOrderingField } from './programmes.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

// Allow-listed filter keys (besides the common page/page_size/ordering/search). `publication_state`
// is admin-only. API spec §6 (programmes public filters: commodity, programme, year).
const PUBLIC_FILTER_KEYS = ['commodity', 'show_on_homepage', 'year'] as const;
const ADMIN_FILTER_KEYS = [...PUBLIC_FILTER_KEYS, 'publication_state'] as const;

function yearOf(v: unknown): number | undefined {
  const s = str(v);
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1900 || n > 3000) throw new ValidationError({ year: ['Invalid year.'] });
  return n;
}

export function parseProgrammeFilters(req: Request, opts: { admin: boolean }): ProgrammeFilters {
  const q = req.query;
  assertKnownQueryKeys(q, opts.admin ? ADMIN_FILTER_KEYS : PUBLIC_FILTER_KEYS);
  const filters: ProgrammeFilters = {
    commodity: str(q.commodity),
    showOnHomepage: parseBooleanFlag(q.show_on_homepage, 'show_on_homepage'),
    year: yearOf(q.year),
    search: str(q.search),
  };
  if (opts.admin) filters.publicationState = parsePublicationState(q.publication_state);
  return filters;
}

const ADMIN_DEFAULT = { field: 'created_at' as ProgrammeOrderingField, direction: 'desc' as const };
const PUBLIC_DEFAULT = { field: 'display_order' as ProgrammeOrderingField, direction: 'asc' as const };

export function parseProgrammeOrdering(
  req: Request,
  admin: boolean,
): { field: ProgrammeOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, PROGRAMME_ORDERING_FIELDS, admin ? ADMIN_DEFAULT : PUBLIC_DEFAULT);
  return { field: ob.field as ProgrammeOrderingField, direction: ob.direction };
}
