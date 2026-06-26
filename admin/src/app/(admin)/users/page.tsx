<<<<<<< HEAD
/**
 * `/users` — administrator account management (Super Admin only).
 */
import { UserListPage } from '@/features/users';

=======
import type { Metadata } from 'next';
import { UserListPage } from '@/features/users';

export const metadata: Metadata = { title: 'Users' };

>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
export default function UsersRoute() {
  return <UserListPage />;
}
