/**
 * `/dashboard/metrics/new` — add a metric to a report (report-scoped) (Phase 15.8).
 * Metrics are created within a report; the manager's "Add metric" action opens the create dialog.
 */
import { MetricsLandingPage } from '@/features/dashboard-data';

export default function NewDashboardMetricRoute({
  searchParams,
}: {
  searchParams: { report?: string };
}) {
  return <MetricsLandingPage reportId={searchParams.report} />;
}
