/**
 * Server-side public API access for Server Components (SSR/ISR). Fetches the
 * Express backend directly via its absolute origin — server-to-server, so no CORS
 * and no proxy hop. Uses the native `fetch` so Next.js can cache/revalidate (ISR).
 *
 * All responses use the single envelope (API spec §1.4); these helpers unwrap
 * `data`/`pagination` and throw a typed `ApiError` on failure. There is no auth —
 * the public namespace is unauthenticated and returns published records only.
 */

import 'server-only';
import { env } from '@/config/env';
import type { ListResult, PaginatedResponse, SuccessResponse, ErrorResponse } from '@/lib/types/api';

/** Default ISR window for public content (seconds). Tunable per call. */
export const DEFAULT_REVALIDATE = 300;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${env.serverApiBaseUrl}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

interface FetchOpts {
  query?: Query;
  /** ISR revalidate seconds; `false` for no caching (always dynamic). */
  revalidate?: number | false;
  tags?: string[];
}

async function request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { query, revalidate = DEFAULT_REVALIDATE, tags } = opts;
  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      headers: { Accept: 'application/json' },
      next: { revalidate: revalidate === false ? 0 : revalidate, tags },
    });
  } catch (err) {
    throw new ApiError(0, 'network_error', err instanceof Error ? err.message : 'Network error');
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, 'invalid_response', 'Malformed response from server.');
  }

  if (!res.ok || (json as { success?: boolean }).success === false) {
    const errBody = json as ErrorResponse;
    throw new ApiError(
      res.status,
      errBody?.error?.code ?? 'error',
      errBody?.error?.message ?? `Request failed (${res.status}).`,
    );
  }

  return json as T;
}

/** Fetch a single resource and return the unwrapped `data`. */
export async function getOne<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const body = await request<SuccessResponse<T>>(path, opts);
  return body.data;
}

/**
 * Fetch a single resource, returning `null` on 404 instead of throwing — for
 * detail pages that should render Next's `notFound()`.
 */
export async function getOneOrNull<T>(path: string, opts: FetchOpts = {}): Promise<T | null> {
  try {
    return await getOne<T>(path, opts);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return null;
    throw err;
  }
}

/** Fetch a paginated list and return `{ items, pagination }`. */
export async function getList<T>(path: string, opts: FetchOpts = {}): Promise<ListResult<T>> {
  const body = await request<PaginatedResponse<T>>(path, opts);
  return { items: body.data, pagination: body.pagination };
}

/**
 * Fetch a list but never throw — returns an empty list on any error. Useful for
 * the homepage / non-critical sections that should degrade gracefully rather than
 * fail the whole page render.
 */
export async function getListSafe<T>(path: string, opts: FetchOpts = {}): Promise<ListResult<T>> {
  try {
    return await getList<T>(path, opts);
  } catch {
    return { items: [], pagination: { page: 1, page_size: 0, total_items: 0, total_pages: 0 } };
  }
}

/** Fetch a single resource but never throw — returns `null` on any error. */
export async function getOneSafe<T>(path: string, opts: FetchOpts = {}): Promise<T | null> {
  try {
    return await getOne<T>(path, opts);
  } catch {
    return null;
  }
}
