/**
 * Background-jobs foundation entrypoint.
 *
 * FOUNDATION ONLY — no queues or workers are started yet. This module exposes the
 * lifecycle hooks the server calls at boot/shutdown and the place future Phase-1 job
 * modules will register themselves.
 *
 * When jobs are added, each gets its own file (e.g. src/jobs/scheduled-publishing.ts)
 * exporting a queue (via createQueue) and a worker factory (via createWorker), and is
 * referenced from `startWorkers()` below. Workers call module services, not repos.
 */
import type { Worker } from 'bullmq';
import { pingQueueBackend, closeQueueConnection } from './connection';
import { getRegisteredQueues } from './queue';
import { logger } from '@/shared/logger';

const jobsLog = logger.child({ component: 'jobs' });

/** Workers started at boot. Empty until Phase-1 jobs are introduced. */
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
 * Start background workers. No-op in the foundation; future job modules push their
 * worker here. Kept separate from initJobs so the API process and a dedicated worker
 * process can opt in independently.
 */
export function startWorkers(): void {
  // e.g. workers.push(startScheduledPublishingWorker());
  if (workers.length === 0) {
    jobsLog.info('No background workers registered (foundation phase)');
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
