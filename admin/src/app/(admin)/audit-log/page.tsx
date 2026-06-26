/**
 * `/audit-log` — Audit Log list (Phase 15.9). Read-only; Super Admin only.
 */
import { AuditListPage } from '@/features/audit';

export default function AuditLogRoute() {
  return <AuditListPage />;
}
