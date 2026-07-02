'use client';

/**
 * Server-side relationship search (Phase 15.3 remediation — Finding 4).
 *
 * The original `useRelationOptions` loaded ONE max-size page (`page_size=PAGE_SIZE_MAX`) and
 * filtered archived records in the browser. That does not scale: a programme/institution/
 * gallery/document list can exceed one page, so options silently went missing and every
 * keystroke filtered a stale client-side slice. This hook instead pushes search, pagination,
 * and archived exclusion to the backend — the same admin list endpoints the modules already
 * own (programmes/institutions/galleries/documents/events), which all accept
 * `page`, `page_size`, `search`, and `publication_state` (see each module's `*.query.ts`).
 *
 * Archived filtering is performed SERVER-SIDE: we request `publication_state=published`. The
 * frozen admin list contract exposes only a single-value `publication_state` filter (there is
 * no "exclude-archived" flag), and relations only render on the public, published-facing pages,
 * so "published" is the faithful server-side realization of "not archived". Callers that need a
 * different scope pass `publicationState` explicitly (`'all'` sends none).
 *
 * Reuses the shared `getList` transport and React Query's `useInfiniteQuery` for cursor-free
 * page accumulation — no bespoke fetch logic, no `PAGE_SIZE_MAX`.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { adminResource } from '@/constants/api-endpoints';
import { getList, type PaginatedResult } from '@/lib/api/http';
import type { PublicationState } from '@/types/common';

/** Page size for picker results — small, paginated, never `PAGE_SIZE_MAX`. */
export const RELATION_PAGE_SIZE = 20;

/** Minimal shape returned by the admin content lists we link against. */
export interface RelationRecord {
  id: string;
  slug: string;
  title_en?: string | null;
  name_en?: string | null;
}

/** A pickable option (id + human label), the shape the picker UI renders. */
export interface RelationOption {
  value: string;
  label: string;
}

/** Resolve the display label the same way for every relation resource. */
export function relationLabel(r: RelationRecord): string {
  return r.title_en ?? r.name_en ?? r.slug;
}

export interface UseRelationSearchOptions {
  /** Debounced search term (caller debounces). */
  search?: string;
  /** Only fetch while the picker is open. */
  enabled?: boolean;
  /**
   * Publication scope sent to the backend. Defaults to `'published'` (archived excluded
   * server-side). `'all'` sends no `publication_state` filter.
   */
  publicationState?: PublicationState | 'all';
}

/**
 * Paginated, debounced, server-side search over an admin content resource. Returns the standard
 * `useInfiniteQuery` result; flatten `data.pages[*].items` for rendering and call
 * `fetchNextPage()` for infinite scroll / "load more". `hasNextPage` is derived from the
 * envelope pagination, so the picker never over-fetches.
 */
export function useRelationSearch(resource: string, opts: UseRelationSearchOptions = {}) {
  const { search, enabled = true, publicationState = 'published' } = opts;
  const term = search?.trim() ?? '';

  return useInfiniteQuery({
    queryKey: [resource, 'relation-search', { search: term, state: publicationState }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getList<RelationRecord>(adminResource(resource).list, {
        page: pageParam,
        page_size: RELATION_PAGE_SIZE,
        ...(publicationState === 'all' ? {} : { publication_state: publicationState }),
        ...(term ? { search: term } : {}),
      }),
    getNextPageParam: (lastPage: PaginatedResult<RelationRecord>) => {
      const { page, total_pages } = lastPage.pagination;
      return page < total_pages ? page + 1 : undefined;
    },
    enabled,
    staleTime: 60_000,
  });
}
