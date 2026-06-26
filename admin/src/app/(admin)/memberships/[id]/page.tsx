<<<<<<< HEAD
/** `/memberships/[id]` — membership detail. */
=======
/**
 * `/memberships/[id]` — membership detail / view (Phase 15.8).
 */
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
import { MembershipDetailPage } from '@/features/memberships';

export default function MembershipDetailRoute({ params }: { params: { id: string } }) {
  return <MembershipDetailPage id={params.id} />;
}
