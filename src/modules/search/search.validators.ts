/**
 * Global Search request validation (Phase 13 — api-specification.md §5).
 *
 * `GET /public/search` (and the authenticated `GET /admin/search` counterpart) accept EXACTLY:
 *   q, content_type, commodity, district, programme, year, page, page_size
 * Anything else is rejected with `422 validation_error` (foundation 04-coding-standards §6: "reject
 * unknown filters; never pass arbitrary client fields"). Validation is server-side and reuses the
 * shared error envelope — no business logic here.
 */
import type { Request } from 'express';
import { ValidationError, type FieldErrors } from '@/shared/errors';
import {
  CONTENT_TYPES,
  isContentType,
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  type ContentType,
  type SearchFilters,
} from './search.types';

/** The complete query-key allow-list for the search endpoints (page/page_size parsed separately). */
const ALLOWED_KEYS = new Set<string>([
  'q',
  'content_type',
  'commodity',
  'district',
  'programme',
  'year',
  'page',
  'page_size',
]);

/** Normalize a single-or-array query value to one trimmed string (last wins), or undefined. */
function str(value: unknown): string | undefined {
  if (Array.isArray(value)) return str(value[value.length - 1]);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** Reject any query parameter outside the search allow-list (all offenders reported together). */
function assertKnownKeys(query: Record<string, unknown>): void {
  const unknown = Object.keys(query).filter((k) => !ALLOWED_KEYS.has(k));
  if (unknown.length > 0) {
    const fields: FieldErrors = {};
    for (const key of unknown) fields[key] = ['Unsupported search parameter.'];
    throw new ValidationError(fields, `Unsupported search parameter(s): ${unknown.join(', ')}.`);
  }
}

/** Required search term, length-bounded (api-specification.md §1.5: 2–120 chars). */
function parseQuery(value: unknown): string {
  const q = str(value);
  if (!q) {
    throw new ValidationError({ q: ['This field is required.'] });
  }
  if (q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH) {
    throw new ValidationError({
      q: [`Search query must be between ${MIN_QUERY_LENGTH} and ${MAX_QUERY_LENGTH} characters.`],
    });
  }
  return q;
}

/** Optional `content_type` — comma-separated subset of the allow-list; unknown values → 422. */
function parseContentTypes(value: unknown): ContentType[] {
  const raw = str(value);
  if (!raw) return [...CONTENT_TYPES];
  const requested = raw.split(',').map((s) => s.trim()).filter((s) => s !== '');
  const invalid = requested.filter((s) => !isContentType(s));
  if (invalid.length > 0) {
    throw new ValidationError({
      content_type: [`Unsupported content type(s): ${invalid.join(', ')}. Allowed: ${CONTENT_TYPES.join(', ')}.`],
    });
  }
  // De-duplicate while preserving order; an empty-after-parsing value falls back to all surfaces.
  const unique = [...new Set(requested as ContentType[])];
  return unique.length > 0 ? unique : [...CONTENT_TYPES];
}

/** Optional 4-digit publication year. */
function parseYear(value: unknown): number | undefined {
  const raw = str(value);
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1900 || n > 3000) {
    throw new ValidationError({ year: ['Invalid year.'] });
  }
  return n;
}

/**
 * Validate the request query into framework-free, typed `SearchFilters`. Identical for public and
 * admin search — the visibility difference is enforced in the repository, not here.
 */
export function parseSearchFilters(req: Request): SearchFilters {
  const q = req.query as Record<string, unknown>;
  assertKnownKeys(q);
  return {
    q: parseQuery(q.q),
    contentTypes: parseContentTypes(q.content_type),
    commodity: str(q.commodity),
    district: str(q.district),
    programme: str(q.programme),
    year: parseYear(q.year),
  };
}
