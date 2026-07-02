'use client';

/**
 * `useCrudList` — reusable server-driven list query. Drives every module list page:
 * pass a resource + a (filter/page/ordering) query and get back the paginated
 * result with caching, smooth pagination, and the standard retry policy. No
 * module-specific logic — the query object is built by the filter framework.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import type { ListQuery } from '@/types/api';
import { useResourceApi } from './use-resource-api';

export interface UseCrudListOptions {
  /** Gate the query (e.g. wait for a dependency). Default true. */
  enabled?: boolean;
  /** Keep the previous page visible while the next loads. Default true. */
  keepPrevious?: boolean;
  /** Override the global staleTime for this list. */
  staleTime?: number;
}

export function useCrudList<TSummary>(
  resource: string,
  query?: ListQuery,
  options: UseCrudListOptions = {},
) {
  const api = useResourceApi<TSummary>(resource);
  return useQuery({
    queryKey: queryKeys.resource(resource).list(query),
    queryFn: () => api.list(query),
    enabled: options.enabled ?? true,
    staleTime: options.staleTime,
    placeholderData: options.keepPrevious === false ? undefined : keepPreviousData,
  });
}
