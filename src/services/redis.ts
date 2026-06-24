/**
 * Shared Redis connection service.
 *
 * One reusable ioredis client for cache/ETag/session use across the app. BullMQ keeps
 * its OWN connections (see src/jobs/queue.ts) because it requires
 * `maxRetriesPerRequest: null` and blocking commands; mixing those concerns on one
 * client is discouraged by BullMQ. Both read the same `REDIS_URL`.
 */
import { Redis, type RedisOptions } from 'ioredis';
import { redisConfig } from '@/config';
import { logger } from '@/shared/logger';

const redisLog = logger.child({ component: 'redis' });

/** Base options shared by application Redis clients (not BullMQ). */
export const baseRedisOptions: RedisOptions = {
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 200, 2000),
};

function createRedisClient(): Redis {
  const client = new Redis(redisConfig.url, baseRedisOptions);
  client.on('error', (err) => redisLog.error({ err }, 'Redis error'));
  client.on('ready', () => redisLog.info('Redis ready'));
  client.on('close', () => redisLog.warn('Redis connection closed'));
  return client;
}

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis: Redis = globalForRedis.redis ?? createRedisClient();
globalForRedis.redis = redis;

/** Connect eagerly at boot so a bad Redis URL fails fast. */
export async function connectRedis(): Promise<void> {
  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect();
  }
  await redis.ping();
  redisLog.info('Redis connected');
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  redisLog.info('Redis disconnected');
}

/** Health probe: `PING` returns `PONG`. */
export async function pingRedis(): Promise<boolean> {
  const pong = await redis.ping();
  return pong === 'PONG';
}
