/** `/memberships/[id]` — membership detail. */
import { MembershipDetailPage } from '@/features/memberships';

export default function MembershipDetailRoute({ params }: { params: { id: string } }) {
  return <MembershipDetailPage id={params.id} />;
}
