/**
 * `/dashboard/datasets/[id]` — dataset detail (Phase 15.8).
 */
import { DatasetDetailPage } from '@/features/dashboard-data';

export default function DashboardDatasetDetailRoute({ params }: { params: { id: string } }) {
  return <DatasetDetailPage id={params.id} />;
}
