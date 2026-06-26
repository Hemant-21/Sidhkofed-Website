/**
 * `/dashboard/datasets/new` — create a dataset by importing data into a report (Phase 15.8).
 * A new dataset is produced by the Excel/CSV (or manual rows) import flow.
 */
import { DashboardImportPage } from '@/features/dashboard-data';

export default function NewDashboardDatasetRoute({
  searchParams,
}: {
  searchParams: { report?: string };
}) {
  return <DashboardImportPage reportId={searchParams.report} />;
}
