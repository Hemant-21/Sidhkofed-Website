/**
 * `/dashboard/reports/[id]` — report detail + metrics/datasets/preview management (Phase 15.8).
 */
import { ReportDetailPage } from '@/features/dashboard-data';

export default function DashboardReportDetailRoute({ params }: { params: { id: string } }) {
  return <ReportDetailPage id={params.id} />;
}
