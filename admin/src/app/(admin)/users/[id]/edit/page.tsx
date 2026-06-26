<<<<<<< HEAD
/**
 * `/users/[id]/edit` — edit an administrator account (Super Admin only).
 */
=======
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
import { UserFormPage } from '@/features/users';

export default function EditUserRoute({ params }: { params: { id: string } }) {
  return <UserFormPage id={params.id} />;
}
