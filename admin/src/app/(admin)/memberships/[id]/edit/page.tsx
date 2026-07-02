/**
 * `/memberships/[id]/edit` — edit a membership (Phase 15.8).
 */
import { MembershipFormPage } from '@/features/memberships';

export default function EditMembershipRoute({ params }: { params: { id: string } }) {
  return <MembershipFormPage id={params.id} />;
}
