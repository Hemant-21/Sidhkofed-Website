/**
 * `/memberships/[id]` — membership detail / view (Phase 15.8).
 */
import { MembershipDetailPage } from '@/features/memberships';

export default function MembershipDetailRoute({ params }: { params: { id: string } }) {
  return <MembershipDetailPage id={params.id} />;
}
