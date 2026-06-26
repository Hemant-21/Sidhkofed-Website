/**
 * Unit tests for the highlight-expiry handler: clears expired labels, audits each clear, never
 * touches publication state (it only calls clearHighlight), continues past failures, idempotent.
 */
import { describe, it, expect, vi } from 'vitest';
import { runHighlightExpiry } from './highlight-expiry.job';
import type { JobContext } from '../scheduler.types';
import type { AuditContext } from '@/modules/audit/audit.service';

const actor: AuditContext = { userId: 'sys', authz: { roles: ['super_admin'], permissions: [], isSuperAdmin: true } };
const ctx: JobContext = { actor, now: new Date('2026-06-26T10:00:00Z'), batchSize: 100 };

describe('runHighlightExpiry', () => {
  it('clears each expired highlight and writes an audit entry', async () => {
    const clear = vi.fn().mockResolvedValue(undefined);
    const audit = vi.fn().mockResolvedValue(undefined);
    const findExpired = vi.fn(async (model: string) =>
      model === 'event'
        ? [{ id: 'e1', highlightType: 'urgent' }, { id: 'e2', highlightType: 'new' }]
        : [],
    );
    const resources = [
      { key: 'event', model: 'event' as const, publish: vi.fn() },
      { key: 'tender', model: 'tender' as const, publish: vi.fn() },
    ];

    const result = await runHighlightExpiry(ctx, { resources, findExpired, clear, audit });

    expect(result).toMatchObject({ processed: 2, success: 2, failure: 0 });
    expect(clear).toHaveBeenCalledWith('event', 'e1');
    expect(clear).toHaveBeenCalledWith('event', 'e2');
    expect(audit).toHaveBeenCalledWith('UPDATE', actor, expect.objectContaining({
      module: 'event',
      recordId: 'e1',
      summary: 'HIGHLIGHT_EXPIRED',
      oldValues: { highlight_type: 'urgent' },
      newValues: { highlight_type: null },
    }));
    expect(result.details).toEqual({ cleared_by_module: { event: 2 } });
  });

  it('is a no-op when no highlights have expired (idempotent)', async () => {
    const clear = vi.fn();
    const resources = [{ key: 'page', model: 'page' as const, publish: vi.fn() }];
    const result = await runHighlightExpiry(ctx, {
      resources,
      findExpired: vi.fn().mockResolvedValue([]),
      clear,
      audit: vi.fn(),
    });
    expect(result).toMatchObject({ processed: 0, success: 0, failure: 0 });
    expect(clear).not.toHaveBeenCalled();
  });

  it('continues past a clear failure and records the error', async () => {
    const clear = vi
      .fn()
      .mockRejectedValueOnce(new Error('row locked'))
      .mockResolvedValueOnce(undefined);
    const audit = vi.fn().mockResolvedValue(undefined);
    const findExpired = vi.fn().mockResolvedValue([
      { id: 'c1', highlightType: 'featured' },
      { id: 'c2', highlightType: 'latest' },
    ]);
    const resources = [{ key: 'official_communication', model: 'officialCommunication' as const, publish: vi.fn() }];

    const result = await runHighlightExpiry(ctx, { resources, findExpired, clear, audit });

    expect(result.processed).toBe(2);
    expect(result.success).toBe(1);
    expect(result.failure).toBe(1);
    // The failed clear must NOT have produced an audit entry.
    expect(audit).toHaveBeenCalledTimes(1);
    expect(result.errors[0]).toMatchObject({ module: 'official_communication', recordId: 'c1' });
  });
});
