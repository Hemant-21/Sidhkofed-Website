/**
 * Cache helpers built on the shared QueryClient: invalidation, optimistic-update
 * scaffolding, and prefetch. Future modules call these instead of hand-rolling
 * cache keys/mutation plumbing.
 */

import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import type { ListQuery } from '@/types/api';

/** Invalidate every list+detail query for a resource (after a mutation). */
export function invalidateResource(client: QueryClient, resource: string): Promise<void> {
  return client.invalidateQueries({ queryKey: queryKeys.resource(resource).all });
}

/** Invalidate a single detail entry. */
export function invalidateDetail(
  client: QueryClient,
  resource: string,
  id: string,
): Promise<void> {
  return client.invalidateQueries({ queryKey: queryKeys.resource(resource).detail(id) });
}

/** Prefetch a list page (e.g. on hover/route intent). */
export function prefetchList<T>(
  client: QueryClient,
  resource: string,
  query: ListQuery | undefined,
  fetcher: () => Promise<T>,
): Promise<void> {
  return client.prefetchQuery({
    queryKey: queryKeys.resource(resource).list(query),
    queryFn: fetcher,
  });
}

/**
 * Generic optimistic-update helper for a detail entry. Returns the previous value
 * so the caller can roll back in `onError`.
 */
export async function optimisticDetailUpdate<T>(
  client: QueryClient,
  resource: string,
  id: string,
  updater: (prev: T | undefined) => T,
): Promise<{ previous: T | undefined }> {
  const key = queryKeys.resource(resource).detail(id);
  await client.cancelQueries({ queryKey: key });
  const previous = client.getQueryData<T>(key);
  client.setQueryData<T>(key, (old) => updater(old));
  return { previous };
}
