/**
 * Centralized audit service (TASK 3). The ONE audit system — every state-changing
 * module records through here. Persists immutable rows to `audit_logs` (Part 9).
 *
 * Public surface:
 *   - auditLog(event, ctx, details)   — generic, event-name based
 *   - auditCreate / auditUpdate / auditDelete
 *   - auditPublish / auditUnpublish / auditArchive / auditRestore
 *   - auditService.record(entry)      — legacy semantic-action API (kept so the auth
 *                                        module's existing calls keep working).
 *
 * Captured per the task: user, entity (module), entity_id (record_id), action,
 * old_values/new_values (→ metadata), ip_address (→ hashed `ip_hash`), user_agent
 * (→ metadata), timestamp (created_at). Failures are logged, never thrown — auditing
 * must not break the business operation.
 */
import { Prisma, type AuditAction as PrismaAuditAction } from '@prisma/client';
import { logger } from '@/shared/logger';
import { auditRepository } from './audit.repository';
import { AUDIT_EVENTS, type AuditEventName } from './audit.events';
import type { ResolvedAuthorization } from '@/modules/auth/auth.types';

const auditLogger = logger.child({ component: 'audit' });

/**
 * Report a failed audit write (Issue 10). Auditing must not break the business operation,
 * so we never re-throw — but a failure is NOT swallowed silently: it is logged at error
 * level with `alert: true` and the full intended entry so monitoring can alert on
 * `audit_write_failed`.
 */
function reportAuditFailure(err: unknown, intended: Record<string, unknown>): void {
  auditLogger.error(
    { err, alert: true, event: 'audit_write_failed', intended },
    'AUDIT WRITE FAILED — audit trail may be incomplete',
  );
}

/**
 * Durability (Phase 11 remediation — Issue 2). The audit architecture is intentionally fail-open
 * (audit.md: a failed insert is logged, never thrown — auditing must not break the business
 * operation), so we do NOT make the insert transactional with the mutation. Instead we improve
 * reliability within that contract: a bounded retry rides out a transient DB blip (connection reset,
 * brief unavailability) before the write is reported as failed. Each retry is logged so a flaky audit
 * path is visible, and exhaustion still surfaces via {@link reportAuditFailure} (alertable).
 */
const AUDIT_MAX_ATTEMPTS = 3;
const AUDIT_RETRY_BASE_MS = 25;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Who/where context for an audited action. */
export interface AuditContext {
  userId: string | null;
  /** Privacy-safe hashed client IP (never the raw IP). */
  ipHash?: string | null;
  userAgent?: string | null;
  /**
   * Resolved authorization of the actor (roles/permissions). Populated for HTTP admin requests;
   * used by service-layer state guards (e.g. content-editor cannot edit published content).
   * Absent for non-HTTP callers (seeds/tests), where route-level gating does not apply.
   */
  authz?: ResolvedAuthorization;
}

/** What was affected and how. */
export interface AuditDetails {
  /** Entity/module key, e.g. `settings`, `media`, `galleries`. */
  module: string;
  /** Affected record id (UUID) or null. */
  recordId?: string | null;
  previousState?: string | null;
  newState?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  summary?: string;
  metadata?: Record<string, unknown>;
}

// ── Legacy semantic-action API (Phase 2 compatibility) ───────────────────────
export type AuditAction =
  | 'create' | 'update' | 'publish' | 'unpublish' | 'archive' | 'restore'
  | 'file_replace' | 'media_archive' | 'user_change' | 'master_change'
  | 'settings_change' | 'login' | 'logout'
  | 'role_assigned' | 'role_removed' | 'permission_assigned' | 'permission_removed';

const DB_ACTION_BY_SEMANTIC: Record<AuditAction, PrismaAuditAction> = {
  create: 'create', update: 'update', publish: 'publish', unpublish: 'unpublish',
  archive: 'archive', restore: 'restore', file_replace: 'media_replace',
  media_archive: 'media_replace', user_change: 'update', master_change: 'master_change',
  settings_change: 'config_change', login: 'login', logout: 'login',
  role_assigned: 'update', role_removed: 'update',
  permission_assigned: 'update', permission_removed: 'update',
};

export interface AuditEntry {
  userId: string | null;
  action: AuditAction;
  module: string;
  recordId: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  summary?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
}

/** Low-level write to `audit_logs`. */
async function insert(params: {
  userId: string | null;
  dbAction: PrismaAuditAction;
  module: string;
  recordId: string | null;
  previousState: string | null;
  newState: string | null;
  changeSummary: string;
  metadata: Record<string, unknown>;
  ipHash: string | null;
}): Promise<void> {
  const data = {
    userId: params.userId,
    action: params.dbAction,
    module: params.module,
    recordId: params.recordId,
    previousState: params.previousState,
    newState: params.newState,
    changeSummary: params.changeSummary,
    metadata: params.metadata as Prisma.InputJsonValue,
    ipHash: params.ipHash,
  };

  let lastErr: unknown;
  for (let attempt = 1; attempt <= AUDIT_MAX_ATTEMPTS; attempt += 1) {
    try {
      await auditRepository.create(data);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < AUDIT_MAX_ATTEMPTS) {
        auditLogger.warn(
          { err, attempt, event: 'audit_write_retry', module: params.module, recordId: params.recordId },
          'Audit write failed; retrying',
        );
        await sleep(AUDIT_RETRY_BASE_MS * attempt);
      }
    }
  }
  // Exhausted all attempts — fail-open: report (alertable) but never break the business operation.
  reportAuditFailure(lastErr, {
    action: params.dbAction,
    module: params.module,
    recordId: params.recordId,
    summary: params.changeSummary,
  });
}

/** Legacy semantic-action record (used by the auth module). */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await insert({
      userId: entry.userId,
      dbAction: DB_ACTION_BY_SEMANTIC[entry.action],
      module: entry.module,
      recordId: entry.recordId,
      previousState: entry.previousStatus ?? null,
      newState: entry.newStatus ?? null,
      changeSummary: entry.summary ?? entry.action.toUpperCase(),
      metadata: { event: entry.action, ...(entry.metadata ?? {}) },
      ipHash: entry.ipHash ?? null,
    });
  } catch (err) {
    reportAuditFailure(err, { action: entry.action, module: entry.module, recordId: entry.recordId });
  }
}

/** Generic event-name based audit write (the preferred API for new modules). */
export async function auditLog(event: AuditEventName, ctx: AuditContext, details: AuditDetails): Promise<void> {
  try {
    const metadata: Record<string, unknown> = { event, ...(details.metadata ?? {}) };
    if (details.oldValues) metadata.old_values = details.oldValues;
    if (details.newValues) metadata.new_values = details.newValues;
    if (ctx.userAgent) metadata.user_agent = ctx.userAgent;
    await insert({
      userId: ctx.userId,
      dbAction: AUDIT_EVENTS[event],
      module: details.module,
      recordId: details.recordId ?? null,
      previousState: details.previousState ?? null,
      newState: details.newState ?? null,
      changeSummary: details.summary ?? event,
      metadata,
      ipHash: ctx.ipHash ?? null,
    });
  } catch (err) {
    reportAuditFailure(err, { event, module: details.module, recordId: details.recordId ?? null });
  }
}

const lifecycle =
  (event: AuditEventName) =>
  (ctx: AuditContext, module: string, recordId: string, opts: Partial<AuditDetails> = {}): Promise<void> =>
    auditLog(event, ctx, { module, recordId, ...opts });

export const auditCreate = (
  ctx: AuditContext, module: string, recordId: string, newValues?: Record<string, unknown> | null, opts: Partial<AuditDetails> = {},
): Promise<void> => auditLog('CREATE', ctx, { module, recordId, newValues, ...opts });

export const auditUpdate = (
  ctx: AuditContext, module: string, recordId: string,
  oldValues?: Record<string, unknown> | null, newValues?: Record<string, unknown> | null, opts: Partial<AuditDetails> = {},
): Promise<void> => auditLog('UPDATE', ctx, { module, recordId, oldValues, newValues, ...opts });

export const auditDelete = (
  ctx: AuditContext, module: string, recordId: string, oldValues?: Record<string, unknown> | null, opts: Partial<AuditDetails> = {},
): Promise<void> => auditLog('DELETE', ctx, { module, recordId, oldValues, ...opts });

export const auditPublish = lifecycle('PUBLISH');
export const auditUnpublish = lifecycle('UNPUBLISH');
export const auditArchive = lifecycle('ARCHIVE');
export const auditRestore = lifecycle('RESTORE');

export const auditService = {
  record: recordAudit,
  log: auditLog,
  create: auditCreate,
  update: auditUpdate,
  delete: auditDelete,
  publish: auditPublish,
  unpublish: auditUnpublish,
  archive: auditArchive,
  restore: auditRestore,
};
