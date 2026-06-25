/**
 * Shared list-endpoint query validation (remediation — strict enum validation).
 *
 * Every admin list endpoint must validate its query enums BEFORE the value reaches the
 * service/repository, so an invalid value (e.g. `?publication_state=INVALID`) returns a
 * `422 validation_error` instead of being silently dropped or cast straight into Prisma.
 * Controllers call these helpers and receive already-validated, typed values — no manual
 * `as PublicationState` casts.
 *
 * `page` / `page_size` are validated by `resolvePageParams` (shared/pagination.ts); these
 * helpers cover the remaining common filters (publication_state, boolean flags).
 */
import { z } from 'zod';
import { ValidationError, type FieldErrors } from './errors';
import type { PublicationState } from './publishing';

export const PUBLICATION_STATES = ['draft', 'published', 'unpublished', 'archived'] as const;

const publicationStateSchema = z.enum(PUBLICATION_STATES).optional();
const booleanFlagSchema = z.enum(['true', 'false']).optional();

/** Normalize a single-or-array query value to a single string (last wins), or undefined. */
function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstString(value[value.length - 1]);
  if (value === undefined || value === null || value === '') return undefined;
  return typeof value === 'string' ? value : undefined;
}

function fail(field: string, message: string): never {
  const fields: FieldErrors = { [field]: [message] };
  throw new ValidationError(fields, `Invalid ${field}`);
}

/**
 * Validate `publication_state`. Absent → undefined; a recognised value → typed; anything else
 * → 422. Never lets an invalid enum reach Prisma.
 */
export function parsePublicationState(value: unknown): PublicationState | undefined {
  const raw = firstString(value);
  const parsed = publicationStateSchema.safeParse(raw);
  if (!parsed.success) {
    fail('publication_state', `Must be one of: ${PUBLICATION_STATES.join(', ')}.`);
  }
  return parsed.data as PublicationState | undefined;
}

/**
 * Validate a boolean query flag (e.g. `show_on_homepage`, `public_visibility`). Accepts only
 * `"true"` / `"false"` (or absent). Anything else → 422.
 */
export function parseBooleanFlag(value: unknown, field: string): boolean | undefined {
  const raw = firstString(value);
  const parsed = booleanFlagSchema.safeParse(raw);
  if (!parsed.success) {
    fail(field, 'Must be "true" or "false".');
  }
  return parsed.data === undefined ? undefined : parsed.data === 'true';
}

/** Optional free-text search term (trimmed), or undefined. */
export function parseSearch(value: unknown): string | undefined {
  const raw = firstString(value);
  return raw ? raw.trim() : undefined;
}

/** Pagination keys every list endpoint accepts (validated by resolvePageParams). */
export const COMMON_LIST_QUERY_KEYS = ['page', 'page_size', 'ordering', 'search'] as const;

/**
 * Reject unknown query parameters with a `422` (API spec §1.4: "Reject unknown filters and
 * ordering values with 422; do not pass arbitrary client fields to Prisma"). Pass the endpoint's
 * filter keys; the four common pagination/search keys are always allowed. Unknown keys are
 * reported together so the client sees every offending parameter at once.
 */
export function assertKnownQueryKeys(query: Record<string, unknown>, allowedFilterKeys: readonly string[]): void {
  const allowed = new Set<string>([...COMMON_LIST_QUERY_KEYS, ...allowedFilterKeys]);
  const unknown = Object.keys(query).filter((k) => !allowed.has(k));
  if (unknown.length > 0) {
    const fields: FieldErrors = {};
    for (const key of unknown) fields[key] = ['Unknown query parameter.'];
    throw new ValidationError(fields, `Unknown query parameter(s): ${unknown.join(', ')}.`);
  }
}
