/**
 * Redis-backed mutual-exclusion lock for scheduler jobs (concurrency / "prevent duplicate
 * execution", Phase 14).
 *
 * Even though BullMQ repeatable jobs are de-duplicated per schedule, a long-running tick could
 * still overlap the next tick, and a horizontally-scaled deployment may run more than one worker
 * process. A short-lived `SET NX EX` lock per job name makes every job safe if started twice: the
 * second caller simply skips. The lock is fail-OPEN on a Redis error for *acquisition* of a
 * read-only/idempotent job would be unsafe, so we instead fail-CLOSED (skip) when we cannot prove
 * we hold the lock — never run two copies. Release is best-effort and value-checked so a tick that
 * overran its TTL cannot delete a lock another worker now holds.
 */
import { redis as defaultRedis } from '@/services/redis';
import { logger } from '@/shared/logger';

const lockLog = logger.child({ component: 'scheduler-lock' });

/** Minimal slice of the Redis client the lock needs (so tests can inject a fake). */
export interface LockRedis {
  set(
    key: string,
    value: string,
    mode: 'EX',
    ttl: number,
    nx: 'NX',
  ): Promise<'OK' | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
}

const KEY_PREFIX = 'scheduler:lock:';

/** A held lock; call {@link release} (or use {@link withLock}) when done. */
export interface AcquiredLock {
  key: string;
  token: string;
}

/**
 * Try to acquire the named lock for `ttlSeconds`. Returns the lock handle on success or `null`
 * when another holder owns it (or Redis is unreachable — fail-closed, never double-run).
 */
export async function acquireLock(
  name: string,
  ttlSeconds: number,
  client: LockRedis = defaultRedis as unknown as LockRedis,
): Promise<AcquiredLock | null> {
  const key = `${KEY_PREFIX}${name}`;
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  try {
    const res = await client.set(key, token, 'EX', Math.max(1, ttlSeconds), 'NX');
    return res === 'OK' ? { key, token } : null;
  } catch (err) {
    lockLog.warn({ err, name }, 'lock acquire failed (treating as contended; skipping run)');
    return null;
  }
}

/**
 * Release a lock we hold. Value-checked: only deletes the key when it still carries our token,
 * so an overran tick never clobbers a successor's lock. Best-effort — a failure is logged, not
 * thrown (the TTL guarantees the lock eventually clears regardless).
 */
export async function releaseLock(
  lock: AcquiredLock,
  client: LockRedis = defaultRedis as unknown as LockRedis,
): Promise<void> {
  try {
    const current = await client.get(lock.key);
    if (current === lock.token) await client.del(lock.key);
  } catch (err) {
    lockLog.warn({ err, key: lock.key }, 'lock release failed (will expire via TTL)');
  }
}

/**
 * Run `fn` only if the lock can be acquired; otherwise skip and return `null`. Guarantees the
 * lock is released even if `fn` throws.
 */
export async function withLock<T>(
  name: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
  client: LockRedis = defaultRedis as unknown as LockRedis,
): Promise<T | null> {
  const lock = await acquireLock(name, ttlSeconds, client);
  if (!lock) {
    lockLog.info({ name }, 'scheduler job already running elsewhere; skipping this tick');
    return null;
  }
  try {
    return await fn();
  } finally {
    await releaseLock(lock, client);
  }
}
