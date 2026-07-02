/**
 * Unit test for the event-status recompute handler — maps the events service result onto a
 * JobRunResult and forwards actor/batch/now to the (reused) service method.
 */
import { describe, it, expect, vi } from 'vitest';
import { runEventStatusRecompute } from './event-status.job';
import type { JobContext } from '../scheduler.types';
import type { AuditContext } from '@/modules/audit/audit.service';

const actor: AuditContext = { userId: 'sys', authz: { roles: ['super_admin'], permissions: [], isSuperAdmin: true } };
const ctx: JobContext = { actor, now: new Date('2026-06-26T00:00:00Z'), batchSize: 200 };

describe('runEventStatusRecompute', () => {
  it('reports evaluated/updated counts and delegates to the events service', async () => {
    const recompute = vi.fn().mockResolvedValue({ processed: 5, updated: 2, errors: [] });
    const result = await runEventStatusRecompute(ctx, { recompute });

    expect(recompute).toHaveBeenCalledWith(actor, 200, ctx.now);
    expect(result).toMatchObject({ processed: 5, success: 2, failure: 0 });
    expect(result.details).toEqual({ evaluated: 5, updated: 2 });
  });

  it('surfaces per-record errors as failures', async () => {
    const recompute = vi.fn().mockResolvedValue({
      processed: 3,
      updated: 1,
      errors: [{ recordId: 'e9', message: 'write failed' }],
    });
    const result = await runEventStatusRecompute(ctx, { recompute });
    expect(result.failure).toBe(1);
    expect(result.errors[0]).toMatchObject({ module: 'event', recordId: 'e9' });
  });
});
