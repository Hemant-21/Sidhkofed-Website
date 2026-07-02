/**
 * Queue + Worker factories and a small registry.
 *
 * FOUNDATION ONLY: this provides the reusable BullMQ plumbing. No concrete queues or
 * job processors are registered yet. Phase-1 jobs (scheduled-publishing flip,
 * event_status recalculation, highlight-expiry clearing, YouTube thumbnail
 * extraction, async enquiry-export, dashboard-dataset processing) will register here
 * later and call module SERVICES — never repositories directly
 * (docs/foundation/02-backend-folder-structure.md §jobs).
 */
import { Queue, Worker, type Processor, type QueueOptions, type WorkerOptions } from 'bullmq';
import { queueConnection, queuePrefix, createQueueConnection } from './connection';
import { logger } from '@/shared/logger';

const jobsLog = logger.child({ component: 'jobs' });

/** Sensible Phase-1 defaults: retain a little history, retry with backoff. */
const DEFAULT_QUEUE_OPTIONS: Omit<QueueOptions, 'connection'> = {
  prefix: queuePrefix,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400 },
  },
};

const registry = new Map<string, Queue>();

/**
 * Create (or return the existing) Queue for `name`, sharing the queue connection.
 * Job payload typing is added per-queue when concrete jobs are introduced; the
 * foundation factory stays untyped to avoid BullMQ v5 generic friction.
 */
export function createQueue(name: string, options: Omit<QueueOptions, 'connection'> = {}): Queue {
  const existing = registry.get(name);
  if (existing) return existing;

  const queue = new Queue(name, {
    connection: queueConnection,
    ...DEFAULT_QUEUE_OPTIONS,
    ...options,
  });
  queue.on('error', (err) => jobsLog.error({ err, queue: name }, 'Queue error'));
  registry.set(name, queue);
  jobsLog.debug({ queue: name }, 'Queue registered');
  return queue;
}

/**
 * Create a Worker for `name`. Each worker gets its OWN blocking connection.
 * Returned but not started anywhere yet — wired up when jobs are introduced.
 */
export function createWorker(
  name: string,
  processor: Processor,
  options: Omit<WorkerOptions, 'connection'> = {},
): Worker {
  const worker = new Worker(name, processor, {
    connection: createQueueConnection(),
    prefix: queuePrefix,
    ...options,
  });
  worker.on('failed', (job, err) =>
    jobsLog.error({ err, queue: name, jobId: job?.id }, 'Job failed'),
  );
  worker.on('completed', (job) => jobsLog.debug({ queue: name, jobId: job.id }, 'Job completed'));
  return worker;
}

/** Registered queues (for graceful shutdown / introspection). */
export function getRegisteredQueues(): Queue[] {
  return [...registry.values()];
}
