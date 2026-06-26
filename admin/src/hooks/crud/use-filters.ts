'use client';

/**
 * `useFilters` — reusable, URL-synced filter framework for list pages. It owns the
 * single mapping between list state (search, ordering, page, and an allow-listed
 * set of filters) and the URL query string, and composes a backend-ready
 * `ListQuery`. Server-side filtering only — keys must match the backend allow-list
 * (API spec §1.4), and unknown keys are ignored rather than sent.
 *
 *   const f = useFilters({ keys: ['event_type', 'district', 'event_status'] });
 *   const list = useCrudList('events', f.query);
 *   <FilterBar value={f.filters} onChange={f.setFilter} onReset={f.reset} />
 */

import { useCallback, useMemo } from 'react';
import { PAGE_SIZE_DEFAULT } from '@/constants/app';
import type { ListQuery } from '@/types/api';
import type { FilterController, FilterState } from '@/types/crud';
import { useQueryParams } from '@/hooks/use-query-params';

export interface UseFiltersOptions {
  /** Allow-listed filter param keys (snake_case). Anything else is ignored. */
  keys: string[];
  /** Page size for the composed query (clamped backend-side). */
  pageSize?: number;
}

export function useFilters(options: UseFiltersOptions): FilterController {
  const { keys, pageSize = PAGE_SIZE_DEFAULT } = options;
  const qp = useQueryParams();
  const allowed = useMemo(() => new Set(keys), [keys]);

  const filters = useMemo<FilterState>(() => {
    const out: FilterState = {};
    for (const key of keys) {
      const value = qp.params[key];
      if (value) out[key] = value;
    }
    return out;
  }, [keys, qp.params]);

  const search = qp.params.search ?? '';
  const ordering = qp.params.ordering || undefined;
  const page = Math.max(1, Number(qp.params.page) || 1);

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      if (!allowed.has(key)) return; // never send a non-allow-listed filter
      qp.set({ [key]: value ?? null }); // resets to page 1
    },
    [allowed, qp],
  );

  const setSearch = useCallback((value: string) => qp.set({ search: value || null }), [qp]);

  const setOrdering = useCallback(
    (value: string | undefined) => qp.set({ ordering: value ?? null }, { resetPage: false }),
    [qp],
  );

  const setPage = useCallback(
    (next: number) => qp.set({ page: next > 1 ? next : null }, { resetPage: false }),
    [qp],
  );

  const reset = useCallback(
    () => qp.remove(...keys, 'search', 'ordering', 'page'),
    [keys, qp],
  );

  const query = useMemo<ListQuery>(
    () => ({
      page,
      page_size: pageSize,
      search: search || undefined,
      ordering,
      ...filters,
    }),
    [page, pageSize, search, ordering, filters],
  );

  const isActive =
    Boolean(search) || Boolean(ordering) || Object.keys(filters).length > 0;

  return {
    query,
    filters,
    search,
    ordering,
    page,
    setFilter,
    setSearch,
    setOrdering,
    setPage,
    reset,
    isActive,
  };
}
