/**
 * Centralized client route map. Components/nav never hardcode path strings —
 * they reference ROUTES so a path change is a one-line edit. Module pages are NOT
 * built in this foundation; their routes are reserved here so future modules slot
 * in by adding a folder under src/app/(admin) and wiring nav config.
 */

export const ROUTES = {
  home: '/',
  login: '/login',

  // Admin Dashboard — fixed KPIs, activity, and report status (Phase 15.2).
  dashboard: '/dashboard',

  // Global search results page (Phase 15.2). The search modal (Ctrl/Cmd+K) is
  // available everywhere; this is the dedicated, deep-linkable results surface.
  search: '/search',

  // Knowledge Centre (Phase 15.4) — a curated reader over Documents tagged with
  // show_in_knowledge_centre=true, grouped by knowledge category. It reuses the
  // documents resource; it is not a separate backend entity.
  knowledgeCentre: '/knowledge-centre',

  // Dashboard Data (Phase 15.8) — the FIXED dashboard reports + their metrics/datasets +
  // Excel import. Reports are a fixed, code-referenced set (no builder); these surfaces read and
  // manage backend data only. They live under the dashboard route group.
  dashboardReports: '/dashboard/reports',
  dashboardDatasets: '/dashboard/datasets',
  dashboardMetrics: '/dashboard/metrics',
  dashboardImport: '/dashboard/import',

  // Error / status routes. Runtime errors are caught by error.tsx / global-error.tsx;
  // these are addressable status pages (e.g. for a reverse-proxy `error_page` map).
  // NOTE: avoid the reserved `/500` segment — it collides with Next's generated
  // 500.html at build time on the App Router, so the 500 surface lives at
  // `/server-error`.
  forbidden: '/403',
  notFound: '/404',
  serverError: '/server-error',

  // Reserved future module list routes (folders not created in this foundation).
  // Kept here so navigation + breadcrumbs resolve without magic strings.
  events: '/events',
  news: '/news',
  programmes: '/programmes',
  toolkits: '/toolkits',
  institutions: '/institutions',
  documents: '/documents',
  communications: '/official-communications',
  tenders: '/tenders',
  procurement: '/procurement-updates',
  successStories: '/success-stories',
  pages: '/pages',
  menus: '/menus',
  media: '/media',
  galleries: '/galleries',
  videos: '/videos',
  memberships: '/memberships',
  faqs: '/faqs',
  digitalServices: '/digital-services',
  leadership: '/leadership',
  enquiries: '/enquiries',
  dashboardData: '/dashboard-data',
  masters: '/masters',
  users: '/users',
  roles: '/roles',
  auditLog: '/audit-log',
  settings: '/settings',
  profile: '/profile',
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Routes reachable without authentication (guest-only). */
export const GUEST_ROUTES: string[] = [ROUTES.login];
