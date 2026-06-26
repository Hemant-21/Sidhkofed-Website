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

  /** Admin Dashboard (Phase 15.2). Each surface reads an existing backend endpoint. */
  dashboard: {
    all: ['dashboard'] as const,
    kpis: (period?: object) => ['dashboard', 'kpis', period ?? {}] as const,
    reports: (query?: ListQuery) => ['dashboard', 'reports', query ?? {}] as const,
    /** Backend-computed total for one resource + filter set (read from `pagination`). */
    contentCount: (resource: string, filters?: Record<string, unknown>) =>
      ['dashboard', 'content-count', resource, filters ?? {}] as const,
  },

  /** Recent administrative activity — audit log (Super Admin only). */
  audit: {
    all: ['audit'] as const,
    list: (query?: ListQuery) => ['audit', 'list', query ?? {}] as const,
  },

  /** Global search (Phase 15.2). Keyed by the full validated query object. */
  search: (query?: ListQuery) => ['search', query ?? {}] as const,
} as const;
