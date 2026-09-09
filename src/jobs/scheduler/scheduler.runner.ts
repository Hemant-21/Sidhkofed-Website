/**
 * Job runner — the single wrapper every scheduler tick goes through.
 *
 * Responsibilities (Phase 14 framework requirements):
 *   - System actor: resolve a real Super Admin identity so jobs run as authorized system
 *     operations (audit attribution + service-layer guards behave exactly as for an HTTP admin;
 *     business validation is NEVER bypassed).
 *   - Concurrency: hold a per-job in-process lock for the whole run.
 *   - Structured logging: emit exactly one log line per run with job name, start/end, duration,
 *     processed/success/failure counts and any captured errors (no sensitive data).
 *   - Retry semantics: a per-record failure is captured and the run continues (and is naturally
 *     retried on the next idempotent tick); only an INFRASTRUCTURE failure (DB down, actor
 *     unresolvable mid-run) is logged and re-thrown.
 */
import { schedulerConfig } from '@/config';
import { logger } from '@/shared/logger';
import type { AuditContext } from '@/modules/audit/audit.service';
import { withLock, type LockClient } from './scheduler.lock';
import { schedulerRepository } from './scheduler.repository';
import { type JobHandler, type JobRunResult, type SchedulerJobName } from './scheduler.types';

const runLog = logger.child({ component: 'scheduler' });

/**
 * Build the system AuditContext for background jobs: the oldest active Super Admin, granted
 * `isSuperAdmin` so the content-edit/state guards treat it as an allow-all actor. Returns null when
 * the DB has no Super Admin yet (unseeded) — the caller then skips the tick safely.
 */
async function buildSystemActor(): Promise<AuditContext | null> {
  const userId = await schedulerRepository.findSystemActorId();
  if (!userId) return null;
  return {
    userId,
    ipHash: null,
    userAgent: 'scheduler',
    authz: { roles: ['super_admin'], permissions: [], isSuperAdmin: true },
  };
}

/** Options for a run (defaults come from {@link schedulerConfig}; overridable for tests). */
export interface RunJobOptions {
  now?: Date;
  batchSize?: number;
  lockTtlSeconds?: number;
  /** Inject a system actor (tests); production resolves it via {@link buildSystemActor}. */
  actor?: AuditContext | null;
  /** Inject a lock client for tests; production uses the in-process client. */
  lockClient?: LockClient;
}

/**
 * Execute a scheduler job by name under its lock, logging one structured result line. Returns the
 * {@link JobRunResult}, or `null` when the run was skipped (lock contended or no system actor).
 * Re-throws infrastructure errors so the scheduler tick logs the failure.
 */
export async function runJob(
  name: SchedulerJobName,
  handler: JobHandler,
  opts: RunJobOptions = {},
): Promise<JobRunResult | null> {
  const actor = opts.actor !== undefined ? opts.actor : await buildSystemActor();
  if (!actor) {
    runLog.warn({ job: name }, 'no active Super Admin system actor; skipping scheduler run');
    return null;
  }

  const lockTtl = opts.lockTtlSeconds ?? schedulerConfig.lockTtlSeconds;
  const batchSize = opts.batchSize ?? schedulerConfig.batchSize;
  const now = opts.now ?? new Date();

  return withLock(name, lockTtl, async () => {
    const startedAt = new Date();
    const started = startedAt.getTime();
    try {
      const result = await handler({ actor, now, batchSize });
      logResult(name, startedAt, started, result);
      return result;
    } catch (err) {
      // Infrastructure failure: log and re-throw so the scheduler tick records the failure.
      const finishedAt = new Date();
      runLog.error(
        {
          job: name,
          started_at: startedAt.toISOString(),
          finished_at: finishedAt.toISOString(),
          duration_ms: finishedAt.getTime() - started,
          err,
        },
        'scheduler job failed (will be retried)',
      );
      throw err;
    }
  }, opts.lockClient);
}

function logResult(
  name: SchedulerJobName,
  startedAt: Date,
  startedMs: number,
  result: JobRunResult,
): void {
  const finishedAt = new Date();
  const payload = {
    job: name,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedMs,
    processed: result.processed,
    success: result.success,
    failure: result.failure,
    ...(result.details ? { details: result.details } : {}),
    ...(result.errors.length ? { errors: result.errors } : {}),
  };
  if (result.failure > 0) {
    runLog.warn(payload, 'scheduler job completed with failures');
  } else {
    runLog.info(payload, 'scheduler job completed');
  }
}
