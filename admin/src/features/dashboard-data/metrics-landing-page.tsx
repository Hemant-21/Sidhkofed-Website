'use client';

/**
 * Dashboard Metrics landing page (`/dashboard/metrics`). Metrics live under a report in the backend,
 * so this scopes to a report first, then renders the report-scoped metrics manager (list + add/edit/
 * delete). All values are backend-authored; nothing is computed client-side.
 */

import { ReportScopedShell } from './components/report-scoped-shell';
import { MetricsManager } from './components/metrics-manager';
import { ROUTES } from '@/constants/routes';

export function MetricsLandingPage({ reportId }: { reportId?: string }) {
  return (
    <ReportScopedShell
      title="Dashboard Metrics"
      description="Manage the backend-authored metric figures for a fixed report."
      baseRoute={ROUTES.dashboardMetrics}
      reportId={reportId}
      emptyHint="Pick a report to view and manage its metrics."
    >
      {(id) => <MetricsManager reportId={id} />}
    </ReportScopedShell>
  );
}
