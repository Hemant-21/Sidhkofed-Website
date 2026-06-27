import 'server-only';

/**
 * Server-side helpers for listing pages: searchParam coercion, master-driven
 * filter options, and a year range. Filter values use slugs (the API accepts
 * comma-separated UUIDs/slugs) for readable, stable URLs.
 */

import { getListSafe } from './api/server';
import { PUBLIC_ENDPOINTS } from './api/endpoints';
import type { MasterRef } from './types/api';
import type { FilterOption } from '@/components/listing/filter-bar';

export const PAGE_SIZE = 12;

/** Coerce a searchParam to a 1-based page number (defaults to 1). */
export function toPage(v: string | string[] | undefined): number {
  const raw = Array.isArray(v) ? v[0] : v;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** Coerce a searchParam to a single trimmed string, or undefined when empty. */
export function qstr(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim().length > 0 ? s.trim() : undefined;
}

/** Fetch an active public master list as filter options (value = slug). */
export async function getMasterOptions(key: string): Promise<FilterOption[]> {
  const { items } = await getListSafe<MasterRef>(`${PUBLIC_ENDPOINTS.masters}/${key}`, {
    query: { page_size: 100 },
    revalidate: 3600,
  });
  return items.map((m) => ({ value: m.slug, name_en: m.name_en, name_hi: m.name_hi }));
}

/** A descending range of recent years as filter options. */
export function yearOptions(back = 6): FilterOption[] {
  const current = new Date().getFullYear();
  return Array.from({ length: back }, (_, i) => String(current - i)).map((v) => ({ value: v, name_en: v }));
}

/** Map fixed enum values to filter options (labels come from i18n via the API humanizer fallback). */
export function enumOptions(values: string[]): FilterOption[] {
  return values.map((v) => ({
    value: v,
    name_en: v.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
}
