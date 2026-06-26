/**
 * `/official-communications/[id]` — communication detail / view (Phase 15.6).
 */
import { CommunicationDetailPage } from '@/features/communications';

export default function CommunicationDetailRoute({ params }: { params: { id: string } }) {
  return <CommunicationDetailPage id={params.id} />;
}
