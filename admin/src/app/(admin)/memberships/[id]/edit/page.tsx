<<<<<<< HEAD
/** `/memberships/[id]/edit` — edit a membership. */
=======
/**
 * `/memberships/[id]/edit` — edit a membership (Phase 15.8).
 */
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
import { MembershipFormPage } from '@/features/memberships';

export default function EditMembershipRoute({ params }: { params: { id: string } }) {
  return <MembershipFormPage id={params.id} />;
}
