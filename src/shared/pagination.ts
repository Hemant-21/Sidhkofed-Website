/**
 * Pagination helpers shared by every list endpoint.
 *
 * API spec §1.4: `page` defaults to 1; `page_size` defaults to 20, capped at 100.
 * An out-of-range (too-high) `page` still returns an empty list (handled by repositories),
 * never an error. But a MALFORMED value (non-numeric, negative, zero, fractional) is rejected
 * with `422 validation_error` (remediation Issue 4) instead of silently defaulting.
 */
import { ValidationError, type FieldErrors } from './errors';
import type { Pagination } from './envelope';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PageParams {
  page: number;
  pageSize: number;
  /** Prisma `skip` offset derived from page/pageSize. */
  skip: number;
  /** Prisma `take` value. */
  take: number;
}

/** A raw query value is "absent" when undefined, null, or an empty string → use the default. */
function isAbsent(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Parse one positive-integer pagination param. Absent → `fallback`. Present-but-malformed
 * (non-numeric / negative / zero / fractional / array) → records a 422 field error.
 */
function parsePositiveInt(value: unknown, field: string, fallback: number, errors: FieldErrors): number {
  if (isAbsent(value)) return fallback;
  if (typeof value !== 'string' && typeof value !== 'number') {
    (errors[field] ??= []).push('Must be a positive integer.');
    return fallback;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    (errors[field] ??= []).push('Must be a positive integer.');
    return fallback;
  }
  return n;
}

/**
 * Normalize raw query params into safe page/skip/take values, validating strictly.
 * Throws `ValidationError` (422) for malformed `page`/`page_size`. `page_size` above the cap
 * is clamped to `MAX_PAGE_SIZE` (not an error — the cap is a documented limit, not malformed).
 */
export function resolvePageParams(rawPage?: unknown, rawPageSize?: unknown): PageParams {
  const errors: FieldErrors = {};
  const page = parsePositiveInt(rawPage, 'page', DEFAULT_PAGE, errors);
  const requestedSize = parsePositiveInt(rawPageSize, 'page_size', DEFAULT_PAGE_SIZE, errors);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  const pageSize = Math.min(requestedSize, MAX_PAGE_SIZE);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Build the pagination block for a list envelope from a total count. */
export function buildPagination(totalItems: number, params: PageParams): Pagination {
  return {
    page: params.page,
    page_size: params.pageSize,
    total_items: totalItems,
    total_pages: params.pageSize > 0 ? Math.ceil(totalItems / params.pageSize) : 0,
  };
}
