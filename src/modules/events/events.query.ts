/**
 * Query-string parsing for event list endpoints → framework-free `EventFilters` + allow-listed
 * ordering. Unknown ordering → 422; invalid enum filters → 422; unknown filter keys are ignored.
 */
import type { Request } from 'express';
import type { EventStatus } from '@prisma/client';
import { resolveOrdering } from '@/shared/listing';
import { ValidationError } from '@/shared/errors';
import { parsePublicationState, parseBooleanFlag } from '@/shared/list-query';
import { EVENT_ORDERING_FIELDS, type EventFilters, type EventOrderingField } from './events.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

const EVENT_STATUSES: EventStatus[] = ['scheduled', 'ongoing', 'completed', 'postponed', 'cancelled'];

function statusOf(v: unknown): EventStatus | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (!EVENT_STATUSES.includes(s as EventStatus)) {
    throw new ValidationError({ event_status: [`Must be one of: ${EVENT_STATUSES.join(', ')}.`] });
  }
  return s as EventStatus;
}

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

export function parseEventFilters(req: Request, opts: { admin: boolean }): EventFilters {
  const q = req.query;
  const filters: EventFilters = {
    eventType: str(q.event_type),
    eventStatus: statusOf(q.event_status),
    district: str(q.district),
    block: str(q.block),
    commodity: str(q.commodity),
    programme: str(q.programme),
    institution: str(q.institution),
    showOnHomepage: parseBooleanFlag(q.show_on_homepage, 'show_on_homepage'),
    year: yearOf(q.year),
    dateFrom: dateOf(q.date_from, 'date_from'),
    dateTo: dateOf(q.date_to, 'date_to'),
    search: str(q.search),
  };
  if (opts.admin) filters.publicationState = parsePublicationState(q.publication_state);
  return filters;
}

const ADMIN_DEFAULT = { field: 'created_at' as EventOrderingField, direction: 'desc' as const };
const PUBLIC_DEFAULT = { field: 'start_date' as EventOrderingField, direction: 'desc' as const };

export function parseEventOrdering(req: Request, admin: boolean): { field: EventOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, EVENT_ORDERING_FIELDS, admin ? ADMIN_DEFAULT : PUBLIC_DEFAULT);
  return { field: ob.field as EventOrderingField, direction: ob.direction };
}
