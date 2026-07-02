'use client';

/**
 * Dashboard React Query hooks (Phase 15.2). Each wraps an existing backend
 * endpoint with the standard caching/retry/refresh policy. They expose loading,
 * error, and refetch so every card renders skeleton → data → error → retry without
 * bespoke fetch logic (reuses the Phase-15.1 query stack).
 */

import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import type { ListQuery } from '@/types/api';
import type { DashboardPeriodFilters } from '@/types/dashboard';
import { fetchContentCount, fetchKpis, fetchRecentActivity, fetchReports } from './api';

/** Headline KPI figures (public dashboard subset). Cached a minute; manual refresh supported. */
export function useDashboardKpis(period?: DashboardPeriodFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.kpis(period),
    queryFn: () => fetchKpis(period),
    enabled,
    staleTime: 60_000,
  });
}

/** The fixed report catalog with publication state (drives Report Status + System Status). */
export function useDashboardReports(query?: ListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.reports(query),
    queryFn: () => fetchReports(query),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/** Recent administrative activity (audit log; Super Admin only — gate the call with `enabled`). */
export function useRecentActivity(query?: ListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.audit.list(query),
    queryFn: () => fetchRecentActivity(query),
    enabled,
    staleTime: 30_000,
  });
}

/** A single backend-computed content total (one resource + optional filters). */
export function useContentCount(
  resource: string,
  filters?: Record<string, string | number | boolean | undefined>,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.dashboard.contentCount(resource, filters),
    queryFn: () => fetchContentCount(resource, filters),
    enabled,
    staleTime: 60_000,
  });
}

/** One KPI descriptor: a label + the resource/filters whose backend total it shows. */
export interface ContentCountSpec {
  key: string;
  resource: string;
  filters?: Record<string, string | number | boolean | undefined>;
}

/**
 * Fetch several content totals in parallel (one query per spec, independently
 * cached). Returns the raw query results aligned to the input specs so each KPI
 * card can render its own loading/error state.
 */
export function useContentCounts(specs: ContentCountSpec[], enabled = true) {
  return useQueries({
    queries: specs.map((spec) => ({
      queryKey: queryKeys.dashboard.contentCount(spec.resource, spec.filters),
      queryFn: () => fetchContentCount(spec.resource, spec.filters),
      enabled,
      staleTime: 60_000,
    })),
  });
}
