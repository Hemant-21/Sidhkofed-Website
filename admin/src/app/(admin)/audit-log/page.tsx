/**
<<<<<<< HEAD
 * `/audit-log` — administrative audit trail (Super Admin only).
 */
import { AuditLogPage } from '@/features/audit-log';

export default function AuditLogRoute() {
  return <AuditLogPage />;
=======
 * `/audit-log` — Audit Log list (Phase 15.9). Read-only; Super Admin only.
 */
import { AuditListPage } from '@/features/audit';

export default function AuditLogRoute() {
  return <AuditListPage />;
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
}
