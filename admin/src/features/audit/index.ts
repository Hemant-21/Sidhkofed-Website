/**
 * Audit Log feature (Phase 15.9). Read-only admin frontend for the Audit module — a filtered,
 * paginated list and a read-only detail view of every administrative action. Consumes the existing
 * backend `GET /admin/audit-logs` + `/:id` contract exactly (Super Admin only); nothing is ever
 * editable here.
 */
export { AuditListPage } from './audit-list-page';
export { AuditDetailPage } from './audit-detail-page';
export { AUDIT_RESOURCE } from './types';
export * from './types';
