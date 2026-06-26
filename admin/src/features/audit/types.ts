/**
 * Audit Log module types — a faithful mirror of the backend Audit DTO
 * (src/modules/audit/audit.dto.ts → AuditLogDto). The frontend consumes this contract exactly and
 * never invents fields. `snake_case` matches the API transport (API spec §0).
 *
 * Audit is READ-ONLY (API spec §6 "Audit is read-only"): there is no create/update/delete shape.
 * The DTO does NOT expose an IP address (only an internal `ip_hash` is stored server-side and it is
 * deliberately omitted from the response), so there is no IP column — the task's "IP Address if
 * backend exposes" condition is not met.
 */

/** The resource segment for the shared admin endpoint helpers (`/admin/audit-logs`). */
export const AUDIT_RESOURCE = 'audit-logs';

/** The DB-backed audit action enum (audit.validators.ts → AUDIT_DB_ACTIONS). Filter allow-list. */
export const AUDIT_ACTIONS = [
  'create',
  'update',
  'publish',
  'unpublish',
  'archive',
  'restore',
  'media_replace',
  'config_change',
  'master_change',
  'login',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Human labels for the audit actions (UI only — transport stays lower-case). */
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  create: 'Created',
  update: 'Updated',
  publish: 'Published',
  unpublish: 'Unpublished',
  archive: 'Archived',
  restore: 'Restored',
  media_replace: 'File replaced',
  config_change: 'Settings changed',
  master_change: 'Master changed',
  login: 'Signed in',
};

/** Compact actor reference embedded in an audit row (or null for system/anonymous actions). */
export interface AuditUserRef {
  id: string;
  email: string;
  full_name: string;
}

/**
 * One audit log entry (AuditLogDto). The list and detail responses share the same shape; the detail
 * view simply renders `metadata` and the before/after states in full. Read-only everywhere.
 */
export interface AuditLogEntry {
  id: string;
  action: string;
  /** The precise semantic event (e.g. LOGIN_SUCCESS, MEDIA_UPLOAD), from metadata/summary. */
  event: string | null;
  module: string;
  record_id: string | null;
  previous_state: string | null;
  new_state: string | null;
  change_summary: string | null;
  metadata: unknown;
  user: AuditUserRef | null;
  created_at: string;
}
