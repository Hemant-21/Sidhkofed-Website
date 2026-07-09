/**
 * `/leadership/[id]/edit` — edit a leadership entry.
 */
import { LeadershipFormPage } from '@/features/leadership';

export default function EditLeadershipRoute({ params }: { params: { id: string } }) {
  return <LeadershipFormPage id={params.id} />;
}
