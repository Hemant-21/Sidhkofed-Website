/**
 * Query-string parsing for the admin enquiry list endpoint → validated filters + allow-listed
 * ordering. Unknown keys → 422 (API spec §1.4). Date inputs are YYYY-MM-DD strings.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { assertKnownQueryKeys, parseBooleanFlag } from '@/shared/list-query';
import { ValidationError } from '@/shared/errors';
import { SPAM_STATES, ENQUIRY_ORDERING_FIELDS, type EnquiryFilters, type EnquiryOrderingField } from './enquiries.types';

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

function parseDate(v: unknown, field: string): Date | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new ValidationError({ [field]: ['Use a YYYY-MM-DD date.'] });
  const d = new Date(`${s}T00:00:00Z`);
  if (isNaN(d.getTime())) throw new ValidationError({ [field]: ['Invalid date.'] });
  return d;
}

function parseSpamState(v: unknown): EnquiryFilters['spamState'] {
  const s = str(v);
  if (!s) return undefined;
  if (!(SPAM_STATES as readonly string[]).includes(s)) {
    throw new ValidationError({ spam_state: [`Must be one of: ${SPAM_STATES.join(', ')}.`] });
  }
  return s as EnquiryFilters['spamState'];
}

const ADMIN_FILTER_KEYS = [
  'enquiry_type',
  'spam_state',
  'archived',
  'date_from',
  'date_to',
  'commodity',
  'programme',
] as const;

export function parseEnquiryFilters(req: Request): EnquiryFilters {
  const q = req.query;
  assertKnownQueryKeys(q, ADMIN_FILTER_KEYS);
  return {
    enquiryType: str(q.enquiry_type),
    spamState: parseSpamState(q.spam_state),
    archived: parseBooleanFlag(q.archived, 'archived'),
    dateFrom: parseDate(q.date_from, 'date_from'),
    dateTo: parseDate(q.date_to, 'date_to'),
    commodityId: str(q.commodity),
    programmeId: str(q.programme),
    search: str(q.search),
  };
}

const DEFAULT_ORDERING = { field: 'submitted_at' as EnquiryOrderingField, direction: 'desc' as const };

export function parseEnquiryOrdering(req: Request): { field: EnquiryOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, ENQUIRY_ORDERING_FIELDS, DEFAULT_ORDERING);
  return { field: ob.field as EnquiryOrderingField, direction: ob.direction };
}
