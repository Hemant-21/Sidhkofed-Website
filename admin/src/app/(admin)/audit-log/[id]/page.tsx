/**
 * `/audit-log/[id]` — Audit entry detail (Phase 15.9). Read-only; Super Admin only.
 */
import { AuditDetailPage } from '@/features/audit';

export default function AuditDetailRoute({ params }: { params: { id: string } }) {
  return <AuditDetailPage id={params.id} />;
}
