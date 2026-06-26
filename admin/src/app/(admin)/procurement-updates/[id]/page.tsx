/**
 * `/procurement-updates/[id]` — procurement update detail / view (Phase 15.6).
 */
import { ProcurementDetailPage } from '@/features/procurement';

export default function ProcurementDetailRoute({ params }: { params: { id: string } }) {
  return <ProcurementDetailPage id={params.id} />;
}
