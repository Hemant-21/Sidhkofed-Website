/**
 * Unit tests for the job runner: actor gating, lock-based skip, result pass-through, and the
 * retry boundary (per-record failures are reported; infra throws propagate for BullMQ retry).
 */
import { describe, it, expect, vi } from 'vitest';
import { runJob } from './scheduler.runner';
import type { LockRedis } from './scheduler.lock';
import type { AuditContext } from '@/modules/audit/audit.service';
import { SCHEDULER_JOBS, emptyResult, type JobRunResult } from './scheduler.types';

const actor: AuditContext = {
  userId: 'system-user',
  authz: { roles: ['super_admin'], permissions: [], isSuperAdmin: true },
};

/** Lock fake that always grants. */
function grantingLock(): LockRedis {
  const store = new Map<string, string>();
  return {
    async set(key, value) {
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

/** Lock fake that always denies (pretends someone else holds it). */
const denyingLock: LockRedis = {
  async set() {
    return null;
  },
  async get() {
    return null;
  },
  async del() {
    return 0;
  },
};

describe('runJob', () => {
  it('skips and returns null when no system actor is available', async () => {
    const handler = vi.fn();
    const out = await runJob(SCHEDULER_JOBS.scheduledPublishing, handler, { actor: null });
    expect(out).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs the handler under the lock and returns its result', async () => {
    const result: JobRunResult = { processed: 3, success: 3, failure: 0, errors: [] };
    const handler = vi.fn().mockResolvedValue(result);
    const out = await runJob(SCHEDULER_JOBS.highlightExpiry, handler, {
      actor,
      lockClient: grantingLock(),
      now: new Date('2026-06-26T00:00:00Z'),
      batchSize: 50,
    });
    expect(out).toEqual(result);
    expect(handler).toHaveBeenCalledOnce();
    const ctx = handler.mock.calls[0][0];
    expect(ctx.actor).toBe(actor);
    expect(ctx.batchSize).toBe(50);
    expect(ctx.now.toISOString()).toBe('2026-06-26T00:00:00.000Z');
  });

  it('skips (returns null) when the lock is contended', async () => {
    const handler = vi.fn().mockResolvedValue(emptyResult());
    const out = await runJob(SCHEDULER_JOBS.eventStatus, handler, { actor, lockClient: denyingLock });
    expect(out).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it('re-throws infrastructure errors so BullMQ retries the tick', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('db unreachable'));
    await expect(
      runJob(SCHEDULER_JOBS.dashboardRefresh, handler, { actor, lockClient: grantingLock() }),
    ).rejects.toThrow('db unreachable');
  });
});
