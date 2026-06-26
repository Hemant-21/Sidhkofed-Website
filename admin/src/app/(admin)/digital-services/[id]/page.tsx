/**
 * `/digital-services/[id]` — digital service detail / view (Phase 15.7).
 */
import { DigitalServiceDetailPage } from '@/features/digital-services';

export default function DigitalServiceDetailRoute({ params }: { params: { id: string } }) {
  return <DigitalServiceDetailPage id={params.id} />;
}
