import type { Metadata } from 'next';
import { UserFormPage } from '@/features/users';

export const metadata: Metadata = { title: 'New User' };

export default function NewUserRoute() {
  return <UserFormPage />;
}
