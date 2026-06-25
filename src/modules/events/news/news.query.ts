/**
 * Query-string parsing for news list endpoints → framework-free `NewsFilters` + allow-listed
 * ordering.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { ValidationError } from '@/shared/errors';
import { parsePublicationState, parseBooleanFlag } from '@/shared/list-query';
import { NEWS_ORDERING_FIELDS, type NewsFilters, type NewsOrderingField } from './news.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

function yearOf(v: unknown): number | undefined {
  const s = str(v);
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1900 || n > 3000) throw new ValidationError({ year: ['Invalid year.'] });
  return n;
}

export function parseNewsFilters(req: Request, opts: { admin: boolean }): NewsFilters {
  const q = req.query;
  const filters: NewsFilters = {
    event: str(q.event),
    showOnHomepage: parseBooleanFlag(q.show_on_homepage, 'show_on_homepage'),
    year: yearOf(q.year),
    search: str(q.search),
  };
  if (opts.admin) filters.publicationState = parsePublicationState(q.publication_state);
  return filters;
}

const ADMIN_DEFAULT = { field: 'created_at' as NewsOrderingField, direction: 'desc' as const };
const PUBLIC_DEFAULT = { field: 'news_published_at' as NewsOrderingField, direction: 'desc' as const };

export function parseNewsOrdering(req: Request, admin: boolean): { field: NewsOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, NEWS_ORDERING_FIELDS, admin ? ADMIN_DEFAULT : PUBLIC_DEFAULT);
  return { field: ob.field as NewsOrderingField, direction: ob.direction };
}
