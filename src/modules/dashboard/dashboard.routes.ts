/**
 * Dashboard routes.
 *   /api/v1/admin/dashboard/*  — authenticated. Mounts the live `reports` module only.
 *
 * The legacy `DashboardReport`/`DashboardMetric`/`DashboardDataset` definition/lifecycle routes,
 * the six-report `operational-reports` catalogue, and the Website Metrics module (config/preview/
 * publish + public placements) have all been fully removed — the public site now reads only
 * approved FY `ReportPublication` snapshots via `/api/v1/public/reports*` (see
 * `reports/publications/publications.public.routes.ts`, mounted in `src/routes/index.ts`), and the
 * CMS "Generate Reports" screen reads only `/admin/dashboard/reports*`. The
 * `DashboardReport`/`DashboardMetric`/`DashboardDataset` Prisma models remain in the schema
 * (unused, dummy rows already cleared in an earlier cleanup) — dropping those tables is a separate,
 * deferred cleanup. `WebsiteMetric`/`WebsiteMetricSnapshot` were dropped via migration alongside
 * this change (see prisma/migrations).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { reportsRouter } from './reports/reports.routes';

// ── Admin ─────────────────────────────────────────────────────────────────────
export const dashboardAdminRouter = Router();
dashboardAdminRouter.use(authenticate);

// Reports (Programme / District Activity Coverage / Commodity-wise), guarded by
// `operational_reports.*` keys — see reports.routes.ts.
dashboardAdminRouter.use('/reports', reportsRouter);
