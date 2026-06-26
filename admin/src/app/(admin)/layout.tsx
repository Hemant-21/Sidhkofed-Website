import type { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/auth';
import { AdminShell } from '@/components/navigation';

/**
 * Authenticated admin segment. Every CMS page renders inside this — auth gating
 * (redirect to /login while unauthenticated) + the persistent application shell
 * (sidebar, top nav, content region). Future module routes live as folders under
 * this group and inherit the shell for free.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
