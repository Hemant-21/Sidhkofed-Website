/**
 * Query-string parsing for official-communication list endpoints → framework-free filters +
 * allow-listed ordering. Unknown ordering → 422; unknown filter keys → 422 (API spec §1.4).
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import { ValidationError } from '@/shared/errors';
import { HIGHLIGHT_VALUES } from '@/shared/validation';
import {
  OFFICIAL_COMMUNICATION_ORDERING_FIELDS,
  type OfficialCommunicationFilters,
  type OfficialCommunicationOrderingField,
} from './official-communications.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

function yearOf(v: unknown): number | undefined {
  const s = str(v);
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1900 || n > 3000) throw new ValidationError({ year: ['Invalid year.'] });
  return n;
}

function highlightOf(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (!(HIGHLIGHT_VALUES as readonly string[]).includes(s)) {
    throw new ValidationError({ highlight: [`Must be one of: ${HIGHLIGHT_VALUES.join(', ')}.`] });
  }
  return s;
}

// API spec §5 communication filters: communication_type, year, highlight, show_on_homepage.
const PUBLIC_FILTER_KEYS = ['communication_type', 'year', 'highlight', 'show_on_homepage'] as const;
const ADMIN_FILTER_KEYS = [...PUBLIC_FILTER_KEYS, 'publication_state'] as const;

export function parseOfficialCommunicationFilters(
  req: Request,
  opts: { admin: boolean },
): OfficialCommunicationFilters {
  const q = req.query;
  assertKnownQueryKeys(q, opts.admin ? ADMIN_FILTER_KEYS : PUBLIC_FILTER_KEYS);
  const filters: OfficialCommunicationFilters = {
    communicationType: str(q.communication_type),
    highlight: highlightOf(q.highlight),
    year: yearOf(q.year),
    showOnHomepage: parseBooleanFlag(q.show_on_homepage, 'show_on_homepage'),
    search: str(q.search),
  };
  if (opts.admin) filters.publicationState = parsePublicationState(q.publication_state);
  return filters;
}

const ADMIN_DEFAULT = { field: 'issue_date' as OfficialCommunicationOrderingField, direction: 'desc' as const };
const PUBLIC_DEFAULT = { field: 'issue_date' as OfficialCommunicationOrderingField, direction: 'desc' as const };

export function parseOfficialCommunicationOrdering(
  req: Request,
  admin: boolean,
): { field: OfficialCommunicationOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(
    req.query.ordering,
    OFFICIAL_COMMUNICATION_ORDERING_FIELDS,
    admin ? ADMIN_DEFAULT : PUBLIC_DEFAULT,
  );
  return { field: ob.field as OfficialCommunicationOrderingField, direction: ob.direction };
}
