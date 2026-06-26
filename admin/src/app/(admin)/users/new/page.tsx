<<<<<<< HEAD
/**
 * `/users/new` — create an administrator account (Super Admin only).
 */
import { UserFormPage } from '@/features/users';

=======
import type { Metadata } from 'next';
import { UserFormPage } from '@/features/users';

export const metadata: Metadata = { title: 'New User' };

>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
export default function NewUserRoute() {
  return <UserFormPage />;
}
