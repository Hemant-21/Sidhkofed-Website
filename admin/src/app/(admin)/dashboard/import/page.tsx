/**
 * `/dashboard/import` — Excel Import into a dashboard report's metrics (Phase 15.8).
 */
import { DashboardImportPage } from '@/features/dashboard-data';

export default function DashboardImportRoute({
  searchParams,
}: {
  searchParams: { report?: string };
}) {
  return <DashboardImportPage reportId={searchParams.report} />;
}
