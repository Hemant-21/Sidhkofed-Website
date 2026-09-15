/**
 * Job 4 — Dashboard Refresh (Phase 14), which also covers the public Operational Reports cache
 * (public website `/impact/dashboard` + homepage) and the Website Metrics cache.
 *
 * The legacy `DashboardReport`/`DashboardMetric` public dashboard (Phase 12) has been fully retired
 * — the public website now reads live-calculated Operational Reports directly. This job drops and
 * re-warms that public cache the same way it always warmed the old dashboard/KPI responses: the
 * resolved figures are period-relative (current financial year), so a clock rollover (new day/month,
 * or a financial year boundary) can make a cached response stale even with no admin edit.
 *
 * Website Metrics: for each allowed placement, drop and re-warm the public website-metrics cache.
 * This job NEVER touches the Website Metrics preview/publish path — it only re-reads whatever is
 * currently published (via `websiteMetricsPublicService.getPublicMetrics`) through the same
 * cache-population code the public endpoint itself uses, so a stale response from a config revision
 * or clock rollover self-heals without any admin action or new snapshot being created.
 */
import { operationalReportsPublicService } from '@/modules/dashboard/operational-reports/operational-reports.public.service';
import { invalidateWebsiteMetricsPublicCache } from '@/modules/dashboard/website-metrics/website-metrics.shared';
import { websiteMetricsPublicService } from '@/modules/dashboard/website-metrics/website-metrics.public.service';
import { ALLOWED_PLACEMENTS } from '@/modules/dashboard/website-metrics/website-metrics.types';
import { emptyResult, type JobContext, type JobRunResult } from '../scheduler.types';

export interface DashboardRefreshDeps {
  invalidateOperationalReports: typeof operationalReportsPublicService.invalidatePublicCache;
  warmOperationalReports: typeof operationalReportsPublicService.getAllPublicReports;
  invalidateWebsiteMetrics: typeof invalidateWebsiteMetricsPublicCache;
  warmWebsiteMetrics: typeof websiteMetricsPublicService.getPublicMetrics;
}

const defaultDeps: DashboardRefreshDeps = {
  invalidateOperationalReports: operationalReportsPublicService.invalidatePublicCache,
  warmOperationalReports: operationalReportsPublicService.getAllPublicReports,
  invalidateWebsiteMetrics: invalidateWebsiteMetricsPublicCache,
  warmWebsiteMetrics: websiteMetricsPublicService.getPublicMetrics,
};

export async function runDashboardRefresh(
  _ctx: JobContext,
  deps: DashboardRefreshDeps = defaultDeps,
): Promise<JobRunResult> {
  const result = emptyResult();

  await deps.invalidateOperationalReports();
  const warmed = await deps.warmOperationalReports();
  const operationalReports = warmed.reports.length;

  await deps.invalidateWebsiteMetrics();
  let websiteMetrics = 0;
  for (const placement of ALLOWED_PLACEMENTS) {
    const warmedMetrics = await deps.warmWebsiteMetrics(placement);
    websiteMetrics += warmedMetrics.metrics.length;
  }

  const processed = operationalReports + websiteMetrics;
  result.processed = processed;
  result.success = processed;
  result.details = { operational_reports_warmed: operationalReports, website_metrics_warmed: websiteMetrics };
  return result;
}
