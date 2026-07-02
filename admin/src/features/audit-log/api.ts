'use client';

/**
 * Audit Log data layer. The log is read-only; the shared CRUD list/detail hooks resolve directly
 * against the `audit-logs` admin resource (`GET /admin/audit-logs`, `GET /admin/audit-logs/:id`) —
 * the standard list/detail shape, minus any create/update/lifecycle (never invoked here).
 */

export const AUDIT_RESOURCE = 'audit-logs';
