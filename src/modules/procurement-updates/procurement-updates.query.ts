/**
 * Query-string parsing for procurement-update list endpoints → framework-free filters + allow-listed
 * ordering. Unknown ordering → 422; unknown filter keys → 422 (API spec §1.4).
 *
 * Public filters (API spec §5): procurement_update_type, commodity, district, block, programme,
 * date_from, date_to, year. The admin surface additionally accepts publication_state and
 * show_on_homepage.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import { ValidationError } from '@/shared/errors';
import {
  PROCUREMENT_UPDATE_ORDERING_FIELDS,
  type ProcurementUpdateFilters,
  type ProcurementUpdateOrderingField,
} from './procurement-updates.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

function yearOf(v: unknown): number | undefined {
  const s = str(v);
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1900 || n > 3000) throw new ValidationError({ year: ['Invalid year.'] });
  return n;
}

function dateOf(v: unknown, field: string): Date | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) {
    throw new ValidationError({ [field]: ['Use a YYYY-MM-DD date.'] });
  }
  return new Date(`${s}T00:00:00Z`);
}

const PUBLIC_FILTER_KEYS = [
  'procurement_update_type',
  'commodity',
  'district',
  'block',
  'programme',
  'date_from',
  'date_to',
  'year',
] as const;
const ADMIN_FILTER_KEYS = [...PUBLIC_FILTER_KEYS, 'publication_state', 'show_on_homepage'] as const;

export function parseProcurementUpdateFilters(req: Request, opts: { admin: boolean }): ProcurementUpdateFilters {
  const q = req.query;
  assertKnownQueryKeys(q, opts.admin ? ADMIN_FILTER_KEYS : PUBLIC_FILTER_KEYS);
  const filters: ProcurementUpdateFilters = {
    procurementUpdateType: str(q.procurement_update_type),
    commodity: str(q.commodity),
    district: str(q.district),
    block: str(q.block),
    programme: str(q.programme),
    dateFrom: dateOf(q.date_from, 'date_from'),
    dateTo: dateOf(q.date_to, 'date_to'),
    year: yearOf(q.year),
    search: str(q.search),
  };
  if (opts.admin) {
    filters.publicationState = parsePublicationState(q.publication_state);
    filters.showOnHomepage = parseBooleanFlag(q.show_on_homepage, 'show_on_homepage');
  }
  return filters;
}

const DEFAULT = { field: 'effective_date' as ProcurementUpdateOrderingField, direction: 'desc' as const };

export function parseProcurementUpdateOrdering(
  req: Request,
): { field: ProcurementUpdateOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, PROCUREMENT_UPDATE_ORDERING_FIELDS, DEFAULT);
  return { field: ob.field as ProcurementUpdateOrderingField, direction: ob.direction };
}
