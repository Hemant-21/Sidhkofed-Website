/**
 * `/dashboard/reports/[id]/edit` — edit a report definition (Super Admin) (Phase 15.8).
 */
import { ReportFormPage } from '@/features/dashboard-data';

export default function EditDashboardReportRoute({ params }: { params: { id: string } }) {
  return <ReportFormPage id={params.id} />;
}
