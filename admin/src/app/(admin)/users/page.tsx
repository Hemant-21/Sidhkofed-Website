import type { Metadata } from 'next';
import { UserListPage } from '@/features/users';

export const metadata: Metadata = { title: 'Users' };

export default function UsersRoute() {
  return <UserListPage />;
}
