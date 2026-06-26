/**
 * Shared types for the Phase 14 background scheduler.
 *
 * The scheduler runs a small, fixed set of recurring maintenance jobs (no workflow engine,
 * no distributed queue beyond the existing single BullMQ queue). Every job returns a
 * {@link JobRunResult} so the runner can emit one structured log line per run with the
 * fields the deliverable requires (name, timings, processed/success/failure counts, errors).
 */
import type { AuditContext } from '@/modules/audit/audit.service';

/** The fixed catalogue of scheduler job names (stable identifiers used as BullMQ job names). */
export const SCHEDULER_JOBS = {
  scheduledPublishing: 'scheduled-publishing',
  highlightExpiry: 'highlight-expiry',
  eventStatus: 'event-status-recompute',
  dashboardRefresh: 'dashboard-refresh',
} as const;

export type SchedulerJobName = (typeof SCHEDULER_JOBS)[keyof typeof SCHEDULER_JOBS];

/** A single error captured during a run (the job continues past it where safe). */
export interface JobError {
  /** Resource/module key the failure relates to, when applicable. */
  module?: string;
  /** Affected record id, when applicable. */
  recordId?: string | null;
  message: string;
}

/**
 * The outcome of one job execution. `processed = success + failure`. `details` carries
 * job-specific, non-sensitive counters (e.g. per-module breakdown) for the structured log.
 */
export interface JobRunResult {
  processed: number;
  success: number;
  failure: number;
  errors: JobError[];
  details?: Record<string, unknown>;
}

/** A zero-work result helper. */
export function emptyResult(): JobRunResult {
  return { processed: 0, success: 0, failure: 0, errors: [] };
}

/**
 * Dependencies every job handler receives. Injecting them (rather than importing singletons
 * inside the handler) keeps the handlers pure and unit-testable with fakes — no live DB/Redis
 * needed to assert idempotency, batching and error-continuation behaviour.
 */
export interface JobContext {
  /** System actor identity used for audit + service-layer guards (see scheduler.runner). */
  actor: AuditContext;
  /** Evaluation instant for "due"/"expired" predicates (overridable in tests). */
  now: Date;
  /** Max records to process this tick. */
  batchSize: number;
}

/** A job handler: does the work and reports what happened. Must be idempotent and safe to retry. */
export type JobHandler = (ctx: JobContext) => Promise<JobRunResult>;
