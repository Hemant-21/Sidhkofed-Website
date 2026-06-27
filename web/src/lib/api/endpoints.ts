/**
 * Public endpoint map — the single source of truth for the public API surface the
 * website consumes. These are exactly the routes mounted by the backend under
 * `/api/v1/public/*` (see backend `src/routes/index.ts`). The website never calls
 * an admin or auth endpoint.
 */

export const PUBLIC_ENDPOINTS = {
  homePartners: '/public/home/partners',

  // Content listings + details ({slug})
  events: '/public/events',
  news: '/public/news',
  programmes: '/public/programmes',
  documents: '/public/documents',
  knowledgeCentre: '/public/knowledge-centre',
  toolkits: '/public/toolkits',
  institutions: '/public/institutions',
  communications: '/public/official-communications',
  tenders: '/public/tenders',
  procurement: '/public/procurement-updates',
  memberships: '/public/memberships',
  faqs: '/public/faqs',
  digitalServices: '/public/digital-services',

  // Dashboard
  dashboard: '/public/dashboard',
  dashboardKpis: '/public/dashboard/kpis',

  // Masters (for filter dropdowns)
  masters: '/public/masters', // /{key}

  // Search
  search: '/public/search',
} as const;

/** Build `/public/<resource>/<slug>` */
export function detailPath(base: string, slug: string): string {
  return `${base}/${encodeURIComponent(slug)}`;
}
