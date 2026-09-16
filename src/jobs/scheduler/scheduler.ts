/**
 * Scheduler bootstrap for the single-server native deployment.
 *
 * Recurring maintenance jobs run in-process without BullMQ/in-process cache. Cron support is
 * intentionally limited to the minute cadences used by this project.
 */
import { schedulerConfig } from '@/config';
import { logger } from '@/shared/logger';
import { runJob } from './scheduler.runner';
import { SCHEDULER_JOBS, type JobHandler, type SchedulerJobName } from './scheduler.types';
import { runScheduledPublishing } from './jobs/scheduled-publishing.job';
import { runHighlightExpiry } from './jobs/highlight-expiry.job';
import { runEventStatusRecompute } from './jobs/event-status.job';

const schedulerLog = logger.child({ component: 'scheduler' });

export interface SchedulerHandle {
  close(): Promise<void>;
}

const JOBS: Array<{ name: SchedulerJobName; handler: JobHandler; cron: string }> = [
  { name: SCHEDULER_JOBS.scheduledPublishing, handler: runScheduledPublishing, cron: schedulerConfig.cron.scheduledPublishing },
  { name: SCHEDULER_JOBS.highlightExpiry, handler: runHighlightExpiry, cron: schedulerConfig.cron.highlightExpiry },
  { name: SCHEDULER_JOBS.eventStatus, handler: runEventStatusRecompute, cron: schedulerConfig.cron.eventStatus },
];

function intervalMsFromCron(cron: string): number {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = cron.trim().split(/\s+/);
  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek) {
    throw new Error(`Unsupported scheduler cron: ${cron}`);
  }
  if (hour !== '*' || dayOfMonth !== '*' || month !== '*' || dayOfWeek !== '*') {
    throw new Error(`Unsupported scheduler cron: ${cron}`);
  }
  if (minute === '*') return 60 * 1000;
  if (minute === '0') return 60 * 60 * 1000;
  const every = minute.match(/^\*\/(\d+)$/);
  if (every) return Number(every[1]) * 60 * 1000;
  throw new Error(`Unsupported scheduler cron: ${cron}`);
}

async function runTick(job: { name: SchedulerJobName; handler: JobHandler }): Promise<void> {
  try {
    await runJob(job.name, job.handler);
  } catch (err) {
    schedulerLog.error({ err, job: job.name }, 'scheduler tick failed');
  }
}

export async function startScheduler(): Promise<SchedulerHandle | null> {
  if (!schedulerConfig.enabled) {
    schedulerLog.info('Scheduler disabled (SCHEDULER_ENABLED=false or test env); no jobs registered');
    return null;
  }

  const timers = JOBS.map((job) => {
    const intervalMs = intervalMsFromCron(job.cron);
    const timer = setInterval(() => {
      void runTick(job);
    }, intervalMs);
    timer.unref?.();
    schedulerLog.info({ job: job.name, cron: job.cron, interval_ms: intervalMs }, 'scheduler job registered');
    return timer;
  });

  schedulerLog.info({ jobs: JOBS.map((j) => j.name) }, 'Scheduler started');

  return {
    async close() {
      for (const timer of timers) clearInterval(timer);
      schedulerLog.info('Scheduler stopped');
    },
  };
}
