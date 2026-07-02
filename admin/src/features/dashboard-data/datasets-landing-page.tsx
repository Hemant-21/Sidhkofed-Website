'use client';

/**
 * Dashboard Datasets landing page (`/dashboard/datasets`). Datasets live under a report in the
 * backend, so this scopes to a report first, then renders the report-scoped datasets panel (the
 * imported records list + a link to the Excel Import surface). Individual datasets open at
 * `/dashboard/datasets/{id}`.
 */

import { ReportScopedShell } from './components/report-scoped-shell';
import { DatasetsPanel } from './components/datasets-panel';
import { ROUTES } from '@/constants/routes';

export function DatasetsLandingPage({ reportId }: { reportId?: string }) {
  return (
    <ReportScopedShell
      title="Dashboard Datasets"
      description="Imported summary datasets for a fixed report. Each processed dataset refreshes its metrics."
      baseRoute={ROUTES.dashboardDatasets}
      reportId={reportId}
      emptyHint="Pick a report to view its imported datasets."
    >
      {(id) => <DatasetsPanel reportId={id} />}
    </ReportScopedShell>
  );
}
