/**
 * `/dashboard/metrics` — Dashboard Metrics (report-scoped) (Phase 15.8).
 */
import { MetricsLandingPage } from '@/features/dashboard-data';

export default function DashboardMetricsRoute({
  searchParams,
}: {
  searchParams: { report?: string };
}) {
  return <MetricsLandingPage reportId={searchParams.report} />;
}
