/**
 * Pagination helpers shared by every list endpoint.
 *
 * API spec §1.4: `page` defaults to 1; `page_size` defaults to 20, capped at 100.
 * Invalid pages return an empty list (handled by repositories), never an error.
 */
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

function coerceInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** Normalize raw query params into safe page/skip/take values. */
export function resolvePageParams(rawPage?: unknown, rawPageSize?: unknown): PageParams {
  const page = coerceInt(rawPage, DEFAULT_PAGE);
  const pageSize = Math.min(coerceInt(rawPageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
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
