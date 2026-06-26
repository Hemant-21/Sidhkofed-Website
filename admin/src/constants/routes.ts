/**
 * Centralized client route map. Components/nav never hardcode path strings —
 * they reference ROUTES so a path change is a one-line edit. Module pages are NOT
 * built in this foundation; their routes are reserved here so future modules slot
 * in by adding a folder under src/app/(admin) and wiring nav config.
 */

export const ROUTES = {
  home: '/',
  login: '/login',

  // App shell landing (placeholder home — NOT a dashboard module).
  dashboard: '/dashboard',

  // Error / status routes.
  forbidden: '/403',
  notFound: '/404',
  serverError: '/500',

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
  enquiries: '/enquiries',
  dashboardData: '/dashboard-data',
  masters: '/masters',
  users: '/users',
  auditLog: '/audit-log',
  settings: '/settings',
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Routes reachable without authentication (guest-only). */
export const GUEST_ROUTES: string[] = [ROUTES.login];
