/**
 * Dashboard routes.
 *   /api/v1/admin/dashboard/*  — authenticated. Mounts the two live sub-modules only:
 *       operational-reports  — live-calculated, read-only reports (see operational-reports.routes.ts)
 *       website-metrics      — curated publish/snapshot metrics (see website-metrics.routes.ts)
 *
 * The legacy `DashboardReport` definition/lifecycle routes (`/reports*`, publish/unpublish/archive/
 * restore) and the legacy manual metrics/datasets routes have been fully removed — the
 * `DashboardReport`/`DashboardMetric`/`DashboardDataset` concept is retired in favor of Operational
 * Reports (live-calculated) and Website Metrics (curated). The public `/api/v1/public/dashboard*`
 * routes are likewise removed; the public website now reads `/api/v1/public/operational-reports`
 * (see `operational-reports.public.routes.ts`, mounted directly in `src/routes/index.ts`) and
 * `/api/v1/public/website-metrics`. See git history prior to this change to restore
 * `reportService`/`dashboard.controller.ts`/`dashboard.public.*` if ever needed. The
 * `DashboardReport`/`DashboardMetric`/`DashboardDataset` Prisma models are intentionally left in the
 * schema for now — only the code paths that read/write/seed them are removed.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { operationalReportsRouter } from './operational-reports/operational-reports.routes';
import { websiteMetricsRouter } from './website-metrics/website-metrics.routes';

// ── Admin ─────────────────────────────────────────────────────────────────────
export const dashboardAdminRouter = Router();
dashboardAdminRouter.use(authenticate);

// Operational Reports (Stage 1 of the Operational Reports / Website Metrics plan) — live-calculated,
// read-only reports, guarded by their own `operational_reports.*` keys (see operational-reports.routes.ts).
dashboardAdminRouter.use('/operational-reports', operationalReportsRouter);

// Website Metrics (Stage 2 of the Operational Reports / Website Metrics plan) — admin-configured
// pointers at public-eligible operational-report measures, with their own preview→publish lifecycle
// and `website_metrics.*` permission keys (see website-metrics.routes.ts).
dashboardAdminRouter.use('/website-metrics', websiteMetricsRouter);
