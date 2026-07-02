/**
 * Query-string helpers. The backend accepts comma-separated UUIDs/slugs for
 * repeated relation filters (API spec §1.4) and rejects unknown params; callers
 * pass only allow-listed keys. Undefined/null/empty values are dropped so the URL
 * stays clean and cache keys stay stable.
 */

import type { ListQuery } from '@/types/api';

export type QueryValue = string | number | boolean | null | undefined | Array<string | number>;

/** Serialize a flat object into a `URLSearchParams`. Arrays → comma-joined. */
export function toSearchParams(params: Record<string, QueryValue>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      sp.set(key, value.join(','));
    } else {
      sp.set(key, String(value));
    }
  }
  return sp;
}

/** Build a `?a=1&b=2` string (empty string when no params). */
export function buildQueryString(params: Record<string, QueryValue> | undefined): string {
  if (!params) return '';
  const sp = toSearchParams(params);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Append a query object to a path, preserving any existing query on the path. */
export function withQuery(path: string, params?: Record<string, QueryValue>): string {
  const qs = buildQueryString(params);
  if (!qs) return path;
  return path.includes('?') ? `${path}&${qs.slice(1)}` : `${path}${qs}`;
}

/** Parse a `URLSearchParams`/string into a plain object (single values). */
export function parseSearchParams(input: URLSearchParams | string): Record<string, string> {
  const sp = typeof input === 'string' ? new URLSearchParams(input) : input;
  const out: Record<string, string> = {};
  sp.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/** Normalize a ListQuery into a cache-stable params object (drops empties). */
export function normalizeListQuery(query?: ListQuery): Record<string, QueryValue> {
  if (!query) return {};
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v as QueryValue;
  }
  return out;
}
