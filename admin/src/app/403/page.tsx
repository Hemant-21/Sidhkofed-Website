import type { Metadata } from 'next';
import { ForbiddenState } from '@/components/feedback/forbidden-state';

export const metadata: Metadata = { title: 'Access denied' };

/** Standalone 403 route (also rendered inline by RequirePermission). */
export default function ForbiddenPage() {
  return (
    <div className="min-h-screen">
      <ForbiddenState />
    </div>
  );
}
