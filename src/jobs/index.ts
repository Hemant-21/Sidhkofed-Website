/**
 * Background-jobs entrypoint.
 *
 * Exposes the lifecycle hooks the server calls at boot/shutdown. Phase 14 registers the recurring
 * maintenance scheduler here: `startWorkers()` boots the scheduler worker (gated by
 * SCHEDULER_ENABLED), and `shutdownJobs()` drains it. Workers call module services, not repos.
 */
import type { Worker } from 'bullmq';
import { pingQueueBackend, closeQueueConnection } from './connection';
import { getRegisteredQueues } from './queue';
import { startScheduler } from './scheduler/scheduler';
import { logger } from '@/shared/logger';

const jobsLog = logger.child({ component: 'jobs' });

/** Workers started at boot. Phase 14 registers the scheduler worker here. */
const workers: Worker[] = [];

/**
 * Verify the queue backend is reachable. Called at server boot so "BullMQ connects"
 * is an explicit, failing-fast startup check.
 */
export async function initJobs(): Promise<void> {
  const ok = await pingQueueBackend();
  if (!ok) throw new Error('BullMQ Redis backend did not respond to PING');
  jobsLog.info('BullMQ connected (no jobs registered yet)');
}

/**
 * Start background workers. Boots the Phase 14 scheduler worker (a no-op when SCHEDULER_ENABLED is
 * false or under tests). Kept separate from initJobs so the API process and a dedicated worker
 * process can opt in independently.
 */
export async function startWorkers(): Promise<void> {
  const schedulerWorker = await startScheduler();
  if (schedulerWorker) workers.push(schedulerWorker);
  if (workers.length === 0) {
    jobsLog.info('No background workers registered (scheduler disabled)');
  }
}

/** Gracefully close every queue and worker on shutdown. */
export async function shutdownJobs(): Promise<void> {
  await Promise.allSettled(workers.map((w) => w.close()));
  await Promise.allSettled(getRegisteredQueues().map((q) => q.close()));
  await closeQueueConnection();
  jobsLog.info('Background jobs shut down');
}

export { createQueue, createWorker } from './queue';
