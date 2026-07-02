/**
 * Unit tests for the scheduler Redis lock (concurrency / duplicate-execution prevention).
 * Uses an in-memory fake that emulates `SET NX EX` semantics — no live Redis needed.
 */
import { describe, it, expect, vi } from 'vitest';
import { acquireLock, releaseLock, withLock, type LockRedis } from './scheduler.lock';

/** Minimal fake honoring SET NX (only sets when absent) and value-checked DEL. */
function fakeRedis(): LockRedis & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async set(key, value, _mode, _ttl, _nx) {
      if (store.has(key)) return null;
      store.set(key, value);
      return 'OK';
    },
    async get(key) {
      return store.get(key) ?? null;
    },
    async del(key) {
      return store.delete(key) ? 1 : 0;
    },
  };
}

describe('scheduler lock', () => {
  it('acquires a free lock and blocks a second acquirer', async () => {
    const r = fakeRedis();
    const first = await acquireLock('job-a', 60, r);
    const second = await acquireLock('job-a', 60, r);
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('releases only when the token still matches (no clobbering a successor)', async () => {
    const r = fakeRedis();
    const lock = await acquireLock('job-b', 60, r);
    expect(lock).not.toBeNull();
    // Simulate a successor overwriting the key after our TTL.
    r.store.set(lock!.key, 'someone-elses-token');
    await releaseLock(lock!, r);
    expect(r.store.get(lock!.key)).toBe('someone-elses-token'); // not deleted
  });

  it('withLock runs fn and frees the lock afterward', async () => {
    const r = fakeRedis();
    const fn = vi.fn().mockResolvedValue('done');
    const out = await withLock('job-c', 60, fn, r);
    expect(out).toBe('done');
    expect(fn).toHaveBeenCalledOnce();
    // Lock released → a fresh acquire succeeds.
    expect(await acquireLock('job-c', 60, r)).not.toBeNull();
  });

  it('withLock skips (returns null) when contended', async () => {
    const r = fakeRedis();
    await acquireLock('job-d', 60, r); // pre-held
    const fn = vi.fn();
    const out = await withLock('job-d', 60, fn, r);
    expect(out).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it('releases the lock even when fn throws', async () => {
    const r = fakeRedis();
    await expect(withLock('job-e', 60, async () => { throw new Error('boom'); }, r)).rejects.toThrow('boom');
    expect(await acquireLock('job-e', 60, r)).not.toBeNull();
  });

  it('fails closed (skips) when Redis errors on acquire', async () => {
    const r = fakeRedis();
    r.set = vi.fn().mockRejectedValue(new Error('redis down'));
    expect(await acquireLock('job-f', 60, r)).toBeNull();
  });
});
