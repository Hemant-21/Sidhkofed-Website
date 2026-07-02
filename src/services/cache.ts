/**
 * Cross-cutting Redis JSON cache service.
 *
 * A thin, fail-open wrapper over the shared ioredis client (src/services/redis.ts):
 *   - getJson/setJson store JSON values with a TTL (default `CACHE_TTL_SECONDS`).
 *   - del / delByPrefix invalidate single keys or whole key families (SCAN-based, so it
 *     never blocks Redis with `KEYS`).
 *
 * Caching must never break a request: every operation is wrapped so a Redis outage
 * degrades to a cache miss (read returns null, write/invalidate is a no-op) and is logged,
 * not thrown. Used first by the masters module (public active-list cache, API spec §1.5
 * "cache public master lists") and reusable by `/public/home`, dashboards, etc.
 */
import { redis } from './redis';
import { redisConfig } from '@/config';
import { logger } from '@/shared/logger';

const cacheLog = logger.child({ component: 'cache' });

/** Read a JSON value. Returns null on miss or any Redis error (fail-open). */
export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    cacheLog.warn({ err, key }, 'cache get failed (treating as miss)');
    return null;
  }
}

/** Write a JSON value with a TTL in seconds (defaults to the configured cache TTL). */
export async function setJson(key: string, value: unknown, ttlSeconds = redisConfig.cacheTtlSeconds): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', Math.max(1, ttlSeconds));
  } catch (err) {
    cacheLog.warn({ err, key }, 'cache set failed (ignored)');
  }
}

/** Delete a single key. */
export async function del(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    cacheLog.warn({ err, key }, 'cache del failed (ignored)');
  }
}

/**
 * Delete every key sharing a prefix, using a non-blocking SCAN cursor. Used to invalidate
 * a master's whole public cache family (`masters:public:{key}*`) on any write.
 */
export async function delByPrefix(prefix: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== '0');
  } catch (err) {
    cacheLog.warn({ err, prefix }, 'cache delByPrefix failed (ignored)');
  }
}

export const cacheService = { getJson, setJson, del, delByPrefix };
