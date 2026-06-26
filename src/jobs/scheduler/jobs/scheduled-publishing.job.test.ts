/**
 * Unit tests for the scheduled-publishing handler. Uses fake resources + a fake discovery fn, so it
 * verifies orchestration (reuse of each module's publish, batching, per-record error continuation,
 * idempotent no-op) with no DB.
 */
import { describe, it, expect, vi } from 'vitest';
import { runScheduledPublishing } from './scheduled-publishing.job';
import type { JobContext } from '../scheduler.types';
import type { AuditContext } from '@/modules/audit/audit.service';

const actor: AuditContext = { userId: 'sys', authz: { roles: ['super_admin'], permissions: [], isSuperAdmin: true } };
const ctx: JobContext = { actor, now: new Date('2026-06-26T10:00:00Z'), batchSize: 100 };

describe('runScheduledPublishing', () => {
  it('publishes every due record across modules via the owning service', async () => {
    const eventsPublish = vi.fn().mockResolvedValue(undefined);
    const tendersPublish = vi.fn().mockResolvedValue(undefined);
    const resources = [
      { key: 'event', model: 'event' as const, publish: eventsPublish },
      { key: 'tender', model: 'tender' as const, publish: tendersPublish },
    ];
    const findDue = vi.fn(async (model: string) => (model === 'event' ? ['e1', 'e2'] : ['t1']));

    const result = await runScheduledPublishing(ctx, { resources, findDue });

    expect(result).toMatchObject({ processed: 3, success: 3, failure: 0 });
    expect(eventsPublish).toHaveBeenCalledWith('e1', actor);
    expect(eventsPublish).toHaveBeenCalledWith('e2', actor);
    expect(tendersPublish).toHaveBeenCalledWith('t1', actor);
    expect(result.details).toEqual({ published_by_module: { event: 2, tender: 1 } });
  });

  it('is a no-op when nothing is due (idempotent)', async () => {
    const publish = vi.fn();
    const resources = [{ key: 'event', model: 'event' as const, publish }];
    const result = await runScheduledPublishing(ctx, { resources, findDue: vi.fn().mockResolvedValue([]) });
    expect(result).toMatchObject({ processed: 0, success: 0, failure: 0 });
    expect(publish).not.toHaveBeenCalled();
  });

  it('continues past a per-record publish failure and records it', async () => {
    const publish = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('missing required public field'))
      .mockResolvedValueOnce(undefined);
    const resources = [{ key: 'document', model: 'document' as const, publish }];
    const findDue = vi.fn().mockResolvedValue(['d1', 'd2', 'd3']);

    const result = await runScheduledPublishing(ctx, { resources, findDue });

    expect(result.processed).toBe(3);
    expect(result.success).toBe(2);
    expect(result.failure).toBe(1);
    expect(result.errors[0]).toMatchObject({ module: 'document', recordId: 'd2' });
    expect(publish).toHaveBeenCalledTimes(3);
  });

  it('continues to other modules when one module discovery query fails', async () => {
    const okPublish = vi.fn().mockResolvedValue(undefined);
    const resources = [
      { key: 'event', model: 'event' as const, publish: vi.fn() },
      { key: 'page', model: 'page' as const, publish: okPublish },
    ];
    const findDue = vi.fn(async (model: string) => {
      if (model === 'event') throw new Error('table locked');
      return ['p1'];
    });

    const result = await runScheduledPublishing(ctx, { resources, findDue });

    expect(result.success).toBe(1);
    expect(okPublish).toHaveBeenCalledWith('p1', actor);
    expect(result.errors.some((e) => e.module === 'event')).toBe(true);
  });

  it('passes the batch size through to discovery', async () => {
    const findDue = vi.fn().mockResolvedValue([]);
    const resources = [{ key: 'faq', model: 'faq' as const, publish: vi.fn() }];
    await runScheduledPublishing({ ...ctx, batchSize: 25 }, { resources, findDue });
    expect(findDue).toHaveBeenCalledWith('faq', ctx.now, 25);
  });
});
