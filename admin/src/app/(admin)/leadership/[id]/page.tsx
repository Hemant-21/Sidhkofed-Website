/**
 * `/leadership/[id]` — leadership entry detail / view.
 */
import { LeadershipDetailPage } from '@/features/leadership';

export default function LeadershipDetailRoute({ params }: { params: { id: string } }) {
  return <LeadershipDetailPage id={params.id} />;
}
