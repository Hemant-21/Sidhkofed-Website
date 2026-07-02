/**
 * Job 4 — Dashboard Refresh (Phase 14), which also covers the homepage-KPI refresh.
 *
 * Refreshes the CACHED public dashboard aggregates. The dashboard metrics themselves are durable,
 * editor-managed rows (Phase 12) and are invalidated on every admin write; this job exists because
 * the resolved figures are period-relative (Month / Financial Year / Calendar Year / Cumulative),
 * so a clock rollover (new day/month) can make a cached response stale even with no admin edit. It
 * reuses the Phase 12 public dashboard service only — it never computes new metrics or invents
 * reports.
 *
 * Behaviour: drop the public dashboard cache family, then warm the two hot, parameter-free
 * responses (`/public/dashboard` and `/public/dashboard/kpis`) so the next visitor hits a warm
 * cache. The KPI set is exactly the homepage-safe subset, so warming it satisfies the
 * "homepage refresh" intent for the cached data that actually exists (Job 3).
 */
import { invalidateDashboardCache } from '@/modules/dashboard/dashboard.shared';
import { dashboardPublicService } from '@/modules/dashboard/dashboard.public.service';
import { emptyResult, type JobContext, type JobRunResult } from '../scheduler.types';

export interface DashboardRefreshDeps {
  invalidate: typeof invalidateDashboardCache;
  warmDashboard: typeof dashboardPublicService.dashboard;
  warmKpis: typeof dashboardPublicService.kpis;
}

const defaultDeps: DashboardRefreshDeps = {
  invalidate: invalidateDashboardCache,
  warmDashboard: dashboardPublicService.dashboard,
  warmKpis: dashboardPublicService.kpis,
};

export async function runDashboardRefresh(
  _ctx: JobContext,
  deps: DashboardRefreshDeps = defaultDeps,
): Promise<JobRunResult> {
  const result = emptyResult();
  await deps.invalidate();

  let reports = 0;
  let kpis = 0;
  // Warm the default (unfiltered) period view; per-period views warm lazily on first request.
  const dash = await deps.warmDashboard({});
  reports = dash.reports.length;
  const kpiResult = await deps.warmKpis({});
  kpis = kpiResult.kpis.length;

  result.processed = reports + kpis;
  result.success = reports + kpis;
  result.details = { reports_warmed: reports, kpis_warmed: kpis };
  return result;
}
