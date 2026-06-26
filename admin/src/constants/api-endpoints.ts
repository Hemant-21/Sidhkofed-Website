/**
 * API endpoint builders. Paths are relative to the API base (`/api/v1`, prepended
 * by the axios instance). Only the three real namespaces exist: auth | admin |
 * public (API spec §1.1). No un-versioned `/api/...` contract.
 *
 * This is infrastructure: it exposes the shared **shapes** every module reuses
 * (the standard admin "P" resource pattern + masters). It does NOT enumerate
 * module endpoints as one-off strings — modules build their own paths from
 * `adminResource()` / `publicResource()` so there is no duplicated fetch logic.
 */

export const AUTH_ENDPOINTS = {
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  me: '/auth/me',
} as const;

/**
 * The shared admin "P" (publishable) resource pattern (API spec §3). Every
 * publishable module reuses these — that is the whole point of the foundation.
 */
export function adminResource(resource: string) {
  const base = `/admin/${resource}`;
  return {
    list: base,
    create: base,
    detail: (id: string) => `${base}/${encodeURIComponent(id)}`,
    update: (id: string) => `${base}/${encodeURIComponent(id)}`,
    publish: (id: string) => `${base}/${encodeURIComponent(id)}/publish`,
    unpublish: (id: string) => `${base}/${encodeURIComponent(id)}/unpublish`,
    archive: (id: string) => `${base}/${encodeURIComponent(id)}/archive`,
    restore: (id: string) => `${base}/${encodeURIComponent(id)}/restore`,
  };
}

/** Public list/detail pattern (API spec §5). Details are addressed by slug. */
export function publicResource(resource: string) {
  const base = `/public/${resource}`;
  return {
    list: base,
    detail: (slug: string) => `${base}/${encodeURIComponent(slug)}`,
  };
}

/** Master-data routes (API spec §4). `master_key` is kebab-case, e.g. `event-types`. */
export const MASTERS = {
  admin: (key: string) => `/admin/masters/${key}`,
  adminItem: (key: string, id: string) => `/admin/masters/${key}/${encodeURIComponent(id)}`,
  activate: (key: string, id: string) =>
    `/admin/masters/${key}/${encodeURIComponent(id)}/activate`,
  deactivate: (key: string, id: string) =>
    `/admin/masters/${key}/${encodeURIComponent(id)}/deactivate`,
  public: (key: string) => `/public/masters/${key}`,
} as const;

/**
 * Global Search routes (API spec §5). The authenticated `/admin/search` counterpart
 * spans every publication state for the CMS reader roles; `/public/search` returns
 * only published, publicly-visible records. The admin console uses the admin route.
 */
export const SEARCH_ENDPOINTS = {
  admin: '/admin/search',
  public: '/public/search',
} as const;

/**
 * Dashboard routes (API spec §5/§6). The Admin Dashboard composes:
 *  - the public KPI subset (`/public/dashboard/kpis`) for headline figures, and
 *  - the admin report catalog (`/admin/dashboard/reports`) for report status.
 * Reports are a FIXED set (no builder) — these endpoints read, never define.
 */
export const DASHBOARD_ENDPOINTS = {
  adminReports: '/admin/dashboard/reports',
  adminReportDetail: (id: string) => `/admin/dashboard/reports/${encodeURIComponent(id)}`,
  publicKpis: '/public/dashboard/kpis',
  publicDashboard: '/public/dashboard',
  publicReport: (key: string) => `/public/dashboard/${encodeURIComponent(key)}`,
} as const;

/** Audit log routes (API spec §6). Read-only; Super Admin only. Drives Recent Activity. */
export const AUDIT_ENDPOINTS = {
  list: '/admin/audit-logs',
  detail: (id: string) => `/admin/audit-logs/${encodeURIComponent(id)}`,
} as const;
