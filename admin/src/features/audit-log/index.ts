/**
 * Audit Log feature (Administration). Read-only, server-driven list of audit entries with filtering
 * and a detail drawer, built on the shared DataTable + filter framework and the `/admin/audit-logs`
 * backend contract.
 */
export { AuditLogPage } from './audit-log-page';
export { AUDIT_RESOURCE } from './api';
export * from './types';
