/**
 * `/dashboard/datasets` — Dashboard Datasets (report-scoped) (Phase 15.8).
 */
import { DatasetsLandingPage } from '@/features/dashboard-data';

export default function DashboardDatasetsRoute({
  searchParams,
}: {
  searchParams: { report?: string };
}) {
  return <DatasetsLandingPage reportId={searchParams.report} />;
}
