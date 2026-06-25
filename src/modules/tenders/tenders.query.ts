/**
 * Query-string parsing for tender list endpoints → framework-free filters + allow-listed ordering.
 * Unknown ordering → 422; unknown filter keys → 422 (API spec §1.4).
 *
 * Public filters (API spec §5): tender_type, tender_status, year. The admin surface additionally
 * accepts publication_state and show_on_homepage.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import { ValidationError } from '@/shared/errors';
import {
  TENDER_ORDERING_FIELDS,
  TENDER_STATUSES,
  type TenderFilters,
  type TenderOrderingField,
  type TenderStatus,
} from './tenders.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

function yearOf(v: unknown): number | undefined {
  const s = str(v);
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1900 || n > 3000) throw new ValidationError({ year: ['Invalid year.'] });
  return n;
}

function statusOf(v: unknown): TenderStatus | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (!(TENDER_STATUSES as readonly string[]).includes(s)) {
    throw new ValidationError({ tender_status: [`Must be one of: ${TENDER_STATUSES.join(', ')}.`] });
  }
  return s as TenderStatus;
}

const PUBLIC_FILTER_KEYS = ['tender_type', 'tender_status', 'year'] as const;
const ADMIN_FILTER_KEYS = [...PUBLIC_FILTER_KEYS, 'publication_state', 'show_on_homepage'] as const;

export function parseTenderFilters(req: Request, opts: { admin: boolean }): TenderFilters {
  const q = req.query;
  assertKnownQueryKeys(q, opts.admin ? ADMIN_FILTER_KEYS : PUBLIC_FILTER_KEYS);
  const filters: TenderFilters = {
    tenderType: str(q.tender_type),
    tenderStatus: statusOf(q.tender_status),
    year: yearOf(q.year),
    search: str(q.search),
  };
  if (opts.admin) {
    filters.publicationState = parsePublicationState(q.publication_state);
    filters.showOnHomepage = parseBooleanFlag(q.show_on_homepage, 'show_on_homepage');
  }
  return filters;
}

const DEFAULT = { field: 'submission_deadline' as TenderOrderingField, direction: 'desc' as const };

export function parseTenderOrdering(req: Request): { field: TenderOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, TENDER_ORDERING_FIELDS, DEFAULT);
  return { field: ob.field as TenderOrderingField, direction: ob.direction };
}
