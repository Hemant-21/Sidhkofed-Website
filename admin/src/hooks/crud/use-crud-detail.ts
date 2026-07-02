'use client';

/**
 * `useCrudDetail` — reusable single-record query for edit/detail pages. The query
 * stays disabled until an `id` is present, so it is safe to call on a create route
 * (no id) without a spurious request.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import { useResourceApi } from './use-resource-api';

export interface UseCrudDetailOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useCrudDetail<TDetail>(
  resource: string,
  id: string | undefined,
  options: UseCrudDetailOptions = {},
) {
  const api = useResourceApi<unknown, TDetail>(resource);
  return useQuery({
    queryKey: queryKeys.resource(resource).detail(id ?? ''),
    queryFn: () => api.get(id as string),
    enabled: (options.enabled ?? true) && Boolean(id),
    staleTime: options.staleTime,
  });
}
