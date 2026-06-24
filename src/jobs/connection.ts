/**
 * BullMQ Redis connection.
 *
 * BullMQ needs its own connection settings (`maxRetriesPerRequest: null`, blocking
 * commands) which differ from the application cache client in src/services/redis.ts.
 * Queues may share a single connection; each Worker should be given its own (BullMQ
 * blocks a connection while waiting for jobs). Both connect to the same `REDIS_URL`.
 */
import { Redis } from 'ioredis';
import { redisConfig } from '@/config';
import { logger } from '@/shared/logger';

const queueLog = logger.child({ component: 'bullmq' });

/** Build a fresh ioredis connection tuned for BullMQ. */
export function createQueueConnection(): Redis {
  const conn = new Redis(redisConfig.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
  conn.on('error', (err) => queueLog.error({ err }, 'BullMQ Redis error'));
  return conn;
}

/** Shared connection used by all Queue instances (not by Workers). */
const globalForQueueConn = globalThis as unknown as { bullmqConnection?: Redis };
export const queueConnection: Redis =
  globalForQueueConn.bullmqConnection ?? createQueueConnection();
globalForQueueConn.bullmqConnection = queueConnection;

/** All BullMQ queues/workers live under this prefix (`QUEUE_PREFIX`). */
export const queuePrefix = redisConfig.queuePrefix;

/** Health probe for the queue backend. */
export async function pingQueueBackend(): Promise<boolean> {
  const pong = await queueConnection.ping();
  return pong === 'PONG';
}

export async function closeQueueConnection(): Promise<void> {
  await queueConnection.quit();
  queueLog.info('BullMQ connection closed');
}
