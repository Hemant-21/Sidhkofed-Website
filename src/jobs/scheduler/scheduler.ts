/**
 * Scheduler bootstrap — wires the Phase 14 recurring jobs onto the existing single BullMQ queue.
 *
 * Deliberately small: ONE queue, ONE worker, a fixed map of job-name → handler, and a repeatable
 * schedule per job (cron from config). No distributed queue, no workflow engine, no per-job queues.
 * The worker dispatches each tick through {@link runJob}, which adds the system actor, the
 * cross-process lock, structured logging and retry semantics.
 *
 * Repeatable schedules are made authoritative on every boot: existing repeatables are cleared and
 * re-added from current config, so changing a cron in env takes effect on restart without leaving
 * orphaned schedules.
 */
import type { Job, Worker } from 'bullmq';
import { schedulerConfig } from '@/config';
import { logger } from '@/shared/logger';
import { createQueue, createWorker } from '../queue';
import { runJob } from './scheduler.runner';
import { SCHEDULER_JOBS, type JobHandler, type SchedulerJobName } from './scheduler.types';
import { runScheduledPublishing } from './jobs/scheduled-publishing.job';
import { runHighlightExpiry } from './jobs/highlight-expiry.job';
import { runEventStatusRecompute } from './jobs/event-status.job';
import { runDashboardRefresh } from './jobs/dashboard-refresh.job';

const schedulerLog = logger.child({ component: 'scheduler' });

/** The single queue all scheduler jobs share. */
export const SCHEDULER_QUEUE = 'scheduler';

/** job name → (handler, cron). The one place the catalogue is assembled. */
const JOBS: Array<{ name: SchedulerJobName; handler: JobHandler; cron: string }> = [
  { name: SCHEDULER_JOBS.scheduledPublishing, handler: runScheduledPublishing, cron: schedulerConfig.cron.scheduledPublishing },
  { name: SCHEDULER_JOBS.highlightExpiry, handler: runHighlightExpiry, cron: schedulerConfig.cron.highlightExpiry },
  { name: SCHEDULER_JOBS.eventStatus, handler: runEventStatusRecompute, cron: schedulerConfig.cron.eventStatus },
  { name: SCHEDULER_JOBS.dashboardRefresh, handler: runDashboardRefresh, cron: schedulerConfig.cron.dashboardRefresh },
];

const HANDLERS = new Map<string, JobHandler>(JOBS.map((j) => [j.name, j.handler]));

/**
 * Start the scheduler: register repeatable schedules and a worker. No-op (returns null) when the
 * scheduler is disabled (config flag, or under tests). Returns the Worker so the caller can include
 * it in graceful shutdown.
 */
export async function startScheduler(): Promise<Worker | null> {
  if (!schedulerConfig.enabled) {
    schedulerLog.info('Scheduler disabled (SCHEDULER_ENABLED=false or test env); no jobs registered');
    return null;
  }

  const queue = createQueue(SCHEDULER_QUEUE);

  // Make current config authoritative: clear any prior repeatable schedules, then re-add.
  const existing = await queue.getRepeatableJobs();
  await Promise.all(existing.map((r) => queue.removeRepeatableByKey(r.key)));

  for (const job of JOBS) {
    await queue.add(
      job.name,
      {},
      {
        repeat: { pattern: job.cron, tz: schedulerConfig.timezone },
        attempts: schedulerConfig.jobAttempts,
        backoff: { type: 'exponential', delay: schedulerConfig.jobBackoffMs },
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400 },
      },
    );
    schedulerLog.info({ job: job.name, cron: job.cron, tz: schedulerConfig.timezone }, 'scheduler job registered');
  }

  const worker = createWorker(
    SCHEDULER_QUEUE,
    async (job: Job) => {
      const handler = HANDLERS.get(job.name);
      if (!handler) {
        schedulerLog.warn({ job: job.name }, 'no handler for scheduler job; ignoring');
        return;
      }
      // runJob applies the lock + actor + structured logging; its result is returned for BullMQ.
      return runJob(job.name as SchedulerJobName, handler);
    },
    { concurrency: 1 },
  );

  schedulerLog.info({ jobs: JOBS.map((j) => j.name) }, 'Scheduler started');
  return worker;
}
