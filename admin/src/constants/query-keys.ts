/**
 * Global TanStack Query key factory. One place owns the cache namespace so
 * invalidation is precise and collision-free. Future modules build their keys
 * from `queryKeys.resource(name)` rather than inventing ad-hoc arrays.
 */

import type { ListQuery } from '@/types/api';

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },

  /** Namespaced keys for any admin resource list/detail. */
  resource: (resource: string) => ({
    all: [resource] as const,
    lists: () => [resource, 'list'] as const,
    list: (query?: ListQuery) => [resource, 'list', query ?? {}] as const,
    details: () => [resource, 'detail'] as const,
    detail: (id: string) => [resource, 'detail', id] as const,
  }),

  /** Master-data lists (cached aggressively — they rarely change). */
  master: (key: string) => ['master', key] as const,
} as const;
