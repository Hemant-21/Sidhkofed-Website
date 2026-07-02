/**
 * Dashboard data access (Phase 15.2). Thin fetchers over the shared `http` layer —
 * they consume EXISTING backend endpoints only and never compute a KPI in the
 * frontend (codex §13: backend is the source of truth).
 *
 *  - `fetchKpis`            → GET /public/dashboard/kpis (resolved headline figures)
 *  - `fetchReports`         → GET /admin/dashboard/reports (fixed report catalog + state)
 *  - `fetchRecentActivity`  → GET /admin/audit-logs (Super Admin only)
 *  - `fetchContentCount`    → GET /admin/{resource}?page_size=1 (reads backend `pagination.total_items`)
 *
 * The content-count fetcher returns the BACKEND-computed total for a resource +
 * filter set. It requests a single row and reads `pagination.total_items`; the
 * count is the server's, not a client aggregation of records.
 */

import { get, getList, type PaginatedResult } from '@/lib/api/http';
import { adminResource, DASHBOARD_ENDPOINTS, AUDIT_ENDPOINTS } from '@/constants/api-endpoints';
import type { ListQuery } from '@/types/api';
import type {
  AuditLogEntry,
  DashboardKpisResponse,
  DashboardPeriodFilters,
  DashboardReportSummary,
} from '@/types/dashboard';

/** Headline KPI figures — the homepage-safe resolved metric subset. */
export function fetchKpis(period?: DashboardPeriodFilters): Promise<DashboardKpisResponse> {
  return get<DashboardKpisResponse>(DASHBOARD_ENDPOINTS.publicKpis, {
    params: period ?? {},
  });
}

/** The fixed report catalog with publication state + visibility (management view). */
export function fetchReports(query?: ListQuery): Promise<PaginatedResult<DashboardReportSummary>> {
  return getList<DashboardReportSummary>(DASHBOARD_ENDPOINTS.adminReports, query);
}

/** Recent administrative actions (audit log). Filterable by module/action/date. */
export function fetchRecentActivity(query?: ListQuery): Promise<PaginatedResult<AuditLogEntry>> {
  return getList<AuditLogEntry>(AUDIT_ENDPOINTS.list, query);
}

/**
 * Backend-computed total for one admin resource + filter set. Requests a single
 * row so the response is light; the meaningful value is `pagination.total_items`.
 */
export async function fetchContentCount(
  resource: string,
  filters?: Record<string, string | number | boolean | undefined>,
): Promise<number> {
  const result = await getList<{ id: string }>(adminResource(resource).list, {
    page: 1,
    page_size: 1,
    ...filters,
  });
  return result.pagination.total_items;
}
