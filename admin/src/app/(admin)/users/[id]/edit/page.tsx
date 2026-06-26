/**
 * `/users/[id]/edit` — edit an administrator account (Super Admin only).
 */
import { UserFormPage } from '@/features/users';

export default function EditUserRoute({ params }: { params: { id: string } }) {
  return <UserFormPage id={params.id} />;
}
