/**
 * Unit tests for eventService.recomputeScheduledStatuses (Phase 14 lifecycle automation).
 *
 * Mocks the repository + audit + cache so the test asserts the decision logic only: it reuses
 * deriveEventStatus, updates ONLY records whose derived status changed (idempotent skip), audits
 * each change, invalidates the cache once when anything changed, and collects per-record errors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { repo, audit, cache } = vi.hoisted(() => ({
  repo: {
    findStatusRecomputeCandidates: vi.fn(),
    updateEventStatus: vi.fn(),
  },
  audit: { log: vi.fn() },
  cache: { delByPrefix: vi.fn() },
}));

vi.mock('./events.repository', () => ({ eventRepository: repo }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));

import { eventService } from './events.service';
import type { AuditContext } from '@/modules/audit/audit.service';

const ctx: AuditContext = { userId: 'sys', authz: { roles: ['super_admin'], permissions: [], isSuperAdmin: true } };

beforeEach(() => {
  vi.clearAllMocks();
  repo.updateEventStatus.mockResolvedValue(undefined);
  audit.log.mockResolvedValue(undefined);
  cache.delByPrefix.mockResolvedValue(undefined);
});

describe('recomputeScheduledStatuses', () => {
  it('updates only events whose derived status changed and audits each', async () => {
    const now = new Date('2026-06-26T00:00:00Z');
    repo.findStatusRecomputeCandidates.mockResolvedValue([
      // ongoing today (start <= now <= end) → stays ongoing (skip)
      { id: 'a', startDate: new Date('2026-06-25'), endDate: new Date('2026-06-27'), eventStatus: 'ongoing' },
      // scheduled but now falls inside its range → derives ongoing (update)
      { id: 'b', startDate: new Date('2026-06-20'), endDate: new Date('2026-06-30'), eventStatus: 'scheduled' },
      // scheduled and past end → derives completed (update)
      { id: 'c', startDate: new Date('2026-06-01'), endDate: new Date('2026-06-10'), eventStatus: 'scheduled' },
    ]);

    const result = await eventService.recomputeScheduledStatuses(ctx, 100, now);

    expect(result.processed).toBe(3);
    expect(result.updated).toBe(2);
    expect(repo.updateEventStatus).toHaveBeenCalledTimes(2);
    expect(repo.updateEventStatus).toHaveBeenCalledWith('b', 'ongoing', 'sys');
    expect(repo.updateEventStatus).toHaveBeenCalledWith('c', 'completed', 'sys');
    expect(audit.log).toHaveBeenCalledTimes(2);
    expect(cache.delByPrefix).toHaveBeenCalledOnce();
  });

  it('is a no-op (no writes, no cache bust) when nothing changed', async () => {
    const now = new Date('2026-06-26T00:00:00Z');
    repo.findStatusRecomputeCandidates.mockResolvedValue([
      { id: 'a', startDate: new Date('2026-06-25'), endDate: new Date('2026-06-27'), eventStatus: 'ongoing' },
    ]);
    const result = await eventService.recomputeScheduledStatuses(ctx, 100, now);
    expect(result.updated).toBe(0);
    expect(repo.updateEventStatus).not.toHaveBeenCalled();
    expect(cache.delByPrefix).not.toHaveBeenCalled();
  });

  it('collects a per-record error and keeps processing', async () => {
    const now = new Date('2026-06-26T00:00:00Z');
    repo.findStatusRecomputeCandidates.mockResolvedValue([
      { id: 'b', startDate: new Date('2026-06-20'), endDate: new Date('2026-06-30'), eventStatus: 'scheduled' },
      { id: 'c', startDate: new Date('2026-06-01'), endDate: new Date('2026-06-10'), eventStatus: 'scheduled' },
    ]);
    repo.updateEventStatus.mockRejectedValueOnce(new Error('write failed')).mockResolvedValueOnce(undefined);

    const result = await eventService.recomputeScheduledStatuses(ctx, 100, now);

    expect(result.updated).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ recordId: 'b' });
  });
});
