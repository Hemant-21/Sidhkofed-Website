/**
 * Audit event catalog (TASK 3). Maps each semantic event name the app emits onto the
 * approved `AuditAction` DB enum (database-schema-design.md Part 9). The DB enum is
 * compact by design; the precise event name is preserved in `change_summary` and
 * `metadata.event`, so audit queries stay faithful without a schema change.
 */
import type { AuditAction as PrismaAuditAction } from '@prisma/client';

export const AUDIT_EVENTS = {
  LOGIN_SUCCESS: 'login',
  LOGIN_FAILED: 'login',
  LOGOUT: 'login',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'archive', // hard-delete is rare (draft/unlinked only); recorded as a removal
  PUBLISH: 'publish',
  UNPUBLISH: 'unpublish',
  ARCHIVE: 'archive',
  RESTORE: 'restore',
  SETTINGS_CHANGE: 'config_change',
  MEDIA_UPLOAD: 'create',
  MEDIA_REPLACE: 'media_replace',
  MEDIA_ARCHIVE: 'archive',
  // Master data lifecycle (Phase 4). All map to the compact `master_change` DB action; the
  // precise event (create/update/activate/deactivate) is preserved in change_summary +
  // metadata.event, with old/new values in metadata (TASK 20).
  MASTER_CREATE: 'master_change',
  MASTER_UPDATE: 'master_change',
  MASTER_ACTIVATE: 'master_change',
  MASTER_DEACTIVATE: 'master_change',
} as const satisfies Record<string, PrismaAuditAction>;

export type AuditEventName = keyof typeof AUDIT_EVENTS;
