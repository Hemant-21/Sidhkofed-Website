'use client';

/**
 * `useCrudSearch` — reusable, debounced search bound to a resource list. Combines
 * the debounced search box state with `useCrudList` so a module gets a complete
 * "type to filter" experience (lightweight server-side search, codex §14) with one
 * call. For full list pages prefer `useFilters` (URL-synced); this is for inline /
 * dialog search (e.g. inside a relationship picker).
 */

import { useMemo } from 'react';
import type { ListQuery } from '@/types/api';
import { useSearch } from '@/hooks/use-search';
import { useCrudList } from './use-crud-list';

export interface UseCrudSearchOptions {
  /** Extra fixed query params merged into every request (e.g. a parent filter). */
  baseQuery?: ListQuery;
  /** Don't fire a request until the user has typed (default true). */
  searchRequired?: boolean;
  pageSize?: number;
}

export function useCrudSearch<TSummary>(
  resource: string,
  options: UseCrudSearchOptions = {},
) {
  const { query, setQuery, debouncedQuery, clear } = useSearch();

  const listQuery = useMemo<ListQuery>(
    () => ({
      ...options.baseQuery,
      page: 1,
      page_size: options.pageSize ?? 20,
      search: debouncedQuery || undefined,
    }),
    [options.baseQuery, options.pageSize, debouncedQuery],
  );

  const enabled = options.searchRequired === false || debouncedQuery.trim().length > 0;
  const list = useCrudList<TSummary>(resource, listQuery, { enabled });

  return {
    /** Bind to the SearchInput. */
    query,
    setQuery,
    clear,
    debouncedQuery,
    /** The underlying list query result (items live in `list.data?.items`). */
    list,
  };
}
