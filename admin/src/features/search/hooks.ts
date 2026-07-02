'use client';

/**
 * Global Search hooks (Phase 15.2). `useSearchResults` runs the server-side admin
 * search with the standard caching/keepPrevious policy, and only fires once the
 * (debounced) query meets the backend's minimum length — so we never send a
 * request the backend would reject, and an empty box shows recent/empty UI instead.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/constants/query-keys';
import { MIN_QUERY_LENGTH, type ContentType, type SearchQuery, type SearchResult } from '@/types/search';
import { searchAdmin, buildSearchQuery } from './api';
import { CONTENT_TYPE_ORDER } from './content-type-meta';

/** True when a query string is long enough for the backend to accept it. */
export function isSearchable(q: string): boolean {
  return q.trim().length >= MIN_QUERY_LENGTH;
}

export function useSearchResults(input: SearchQuery, enabled = true) {
  const q = input.q.trim();
  const active = enabled && isSearchable(q);

  return useQuery({
    queryKey: queryKeys.search(buildSearchQuery({ ...input, q })),
    queryFn: () => searchAdmin({ ...input, q }),
    enabled: active,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export interface ResultGroup {
  type: ContentType;
  results: SearchResult[];
}

/** Group a flat result list by content type, preserving the canonical type order. */
export function groupResultsByType(results: SearchResult[]): ResultGroup[] {
  const byType = new Map<ContentType, SearchResult[]>();
  for (const result of results) {
    const bucket = byType.get(result.content_type);
    if (bucket) bucket.push(result);
    else byType.set(result.content_type, [result]);
  }
  return CONTENT_TYPE_ORDER.filter((type) => byType.has(type)).map((type) => ({
    type,
    results: byType.get(type) ?? [],
  }));
}

/** Memoized grouping for components that render grouped results. */
export function useGroupedResults(results: SearchResult[] | undefined): ResultGroup[] {
  return useMemo(() => groupResultsByType(results ?? []), [results]);
}
