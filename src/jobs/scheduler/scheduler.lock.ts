/**
 * In-process mutual-exclusion lock for scheduler jobs.
 *
 * This prevents overlapping ticks within the single API process. If production
 * later adds multiple app servers, replace this with PostgreSQL advisory locks.
 */
import { logger } from '@/shared/logger';

const lockLog = logger.child({ component: 'scheduler-lock' });

export interface LockClient {
  set(key: string, value: string, mode: 'EX', ttl: number, nx: 'NX'): Promise<'OK' | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
}

export interface AcquiredLock {
  key: string;
  token: string;
}

interface StoredLock {
  token: string;
  expiresAt: number;
}

const KEY_PREFIX = 'scheduler:lock:';
const globalForLocks = globalThis as unknown as { schedulerLocks?: Map<string, StoredLock> };
const locks = globalForLocks.schedulerLocks ?? new Map<string, StoredLock>();
globalForLocks.schedulerLocks = locks;

const memoryLockClient: LockClient = {
  async set(key, value, _mode, ttl, _nx) {
    const existing = locks.get(key);
    if (existing && existing.expiresAt > Date.now()) return null;
    locks.set(key, { token: value, expiresAt: Date.now() + Math.max(1, ttl) * 1000 });
    return 'OK';
  },
  async get(key) {
    const existing = locks.get(key);
    if (!existing) return null;
    if (existing.expiresAt <= Date.now()) {
      locks.delete(key);
      return null;
    }
    return existing.token;
  },
  async del(key) {
    return locks.delete(key) ? 1 : 0;
  },
};

export async function acquireLock(
  name: string,
  ttlSeconds: number,
  client: LockClient = memoryLockClient,
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

export async function releaseLock(
  lock: AcquiredLock,
  client: LockClient = memoryLockClient,
): Promise<void> {
  try {
    const current = await client.get(lock.key);
    if (current === lock.token) await client.del(lock.key);
  } catch (err) {
    lockLog.warn({ err, key: lock.key }, 'lock release failed');
  }
}

export async function withLock<T>(
  name: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
  client: LockClient = memoryLockClient,
): Promise<T | null> {
  const lock = await acquireLock(name, ttlSeconds, client);
  if (!lock) {
    lockLog.info({ name }, 'scheduler job already running; skipping this tick');
    return null;
  }
  try {
    return await fn();
  } finally {
    await releaseLock(lock, client);
  }
}
