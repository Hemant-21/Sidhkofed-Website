/**
 * `/tenders/[id]` — tender detail / view (Phase 15.6).
 */
import { TenderDetailPage } from '@/features/tenders';

export default function TenderDetailRoute({ params }: { params: { id: string } }) {
  return <TenderDetailPage id={params.id} />;
}
