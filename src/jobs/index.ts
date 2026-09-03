/**
 * Background-jobs entrypoint.
 *
 * The native Windows deployment no longer depends on BullMQ/Redis. Recurring
 * maintenance jobs run in-process on the single API server.
 */
import { startScheduler, type SchedulerHandle } from './scheduler/scheduler';
import { logger } from '@/shared/logger';

const jobsLog = logger.child({ component: 'jobs' });

let scheduler: SchedulerHandle | null = null;

export async function initJobs(): Promise<void> {
  jobsLog.info('Background jobs initialized');
}

export async function startWorkers(): Promise<void> {
  scheduler = await startScheduler();
  if (!scheduler) {
    jobsLog.info('No background workers registered (scheduler disabled)');
  }
}

export async function shutdownJobs(): Promise<void> {
  await scheduler?.close();
  scheduler = null;
  jobsLog.info('Background jobs shut down');
}
