/**
 * Audit Log module types — mirror of the backend read-only DTO (audit.dto.ts). The log is
 * append-only: the admin surface lists and inspects entries; it never mutates them.
 */

export interface AuditLogActor {
  id: string;
  email: string;
  full_name: string;
}

export interface AuditLog {
  id: string;
  action: string;
  /** Precise semantic event (e.g. LOGIN_SUCCESS, MEDIA_UPLOAD) when present. */
  event: string | null;
  module: string;
  record_id: string | null;
  previous_state: string | null;
  new_state: string | null;
  change_summary: string | null;
  metadata: unknown;
  user: AuditLogActor | null;
  created_at: string;
}

/** The DB action enum the backend accepts as a filter (audit.validators.ts). */
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
