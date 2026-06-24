/**
 * Audit logging hooks — FOUNDATION ONLY.
 *
 * Provides the append-only audit interface every state-changing service will call
 * (create/edit/publish/unpublish/archive/restore/file-replace/media-archive/user/
 * master/settings changes — CMS requirements §17). The persistent `audit_logs` table
 * is part of the governance schema (not in this foundation), so for now entries are
 * structured-logged. When the table exists, swap the sink in `persist()` to a
 * transactional insert; the public API here stays the same.
 */
import { logger } from '@/shared/logger';

const auditLog = logger.child({ component: 'audit' });

/** Canonical audit actions (CMS requirements §17). */
export type AuditAction =
  | 'create'
  | 'update'
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'restore'
  | 'file_replace'
  | 'media_archive'
  | 'user_change'
  | 'master_change'
  | 'settings_change';

export interface AuditEntry {
  /** Acting user id (null for system/scheduler actions). */
  userId: string | null;
  action: AuditAction;
  /** Module/entity key, e.g. `events`, `documents`, `settings`. */
  module: string;
  recordId: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  /** Concise human-readable change summary. */
  summary?: string;
  /** Small, safe metadata bag (never secrets or full record bodies). */
  metadata?: Record<string, unknown>;
}

/**
 * The append-only sink. Today it structured-logs; later it inserts into `audit_logs`
 * (ideally within the caller's transaction). Keep this the single write path so the
 * swap is one place.
 */
async function persist(entry: AuditEntry): Promise<void> {
  auditLog.info({ audit: entry }, 'audit');
  // TODO(governance module): await prisma.auditLog.create({ data: mapAuditEntry(entry) });
}

/** Record an audit entry. Failures must never break the business operation. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await persist(entry);
  } catch (err) {
    auditLog.error({ err, action: entry.action, module: entry.module }, 'Failed to record audit entry');
  }
}

export const auditService = { record: recordAudit };
