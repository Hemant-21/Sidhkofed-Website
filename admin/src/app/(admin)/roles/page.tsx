import type { Metadata } from 'next';
import { RolesPage } from '@/features/roles';

export const metadata: Metadata = { title: 'Roles & Permissions' };

export default function RolesRoute() {
  return <RolesPage />;
}
