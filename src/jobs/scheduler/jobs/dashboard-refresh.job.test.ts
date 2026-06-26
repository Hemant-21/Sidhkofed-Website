/**
 * Unit test for the dashboard-refresh handler — invalidates then warms the cached public dashboard
 * + KPI responses using the reused Phase 12 service (no new metric computation).
 */
import { describe, it, expect, vi } from 'vitest';
import { runDashboardRefresh } from './dashboard-refresh.job';
import type { JobContext } from '../scheduler.types';
import type { AuditContext } from '@/modules/audit/audit.service';

const actor: AuditContext = { userId: 'sys', authz: { roles: ['super_admin'], permissions: [], isSuperAdmin: true } };
const ctx: JobContext = { actor, now: new Date('2026-06-26T00:00:00Z'), batchSize: 100 };

describe('runDashboardRefresh', () => {
  it('invalidates the cache then warms dashboard + KPI responses', async () => {
    const calls: string[] = [];
    const invalidate = vi.fn(async () => { calls.push('invalidate'); });
    const warmDashboard = vi.fn(async () => { calls.push('dashboard'); return { reports: [{}, {}, {}] as never[] }; });
    const warmKpis = vi.fn(async () => { calls.push('kpis'); return { kpis: [{}, {}] as never[] }; });

    const result = await runDashboardRefresh(ctx, { invalidate, warmDashboard, warmKpis });

    expect(calls[0]).toBe('invalidate'); // invalidation happens before warming
    expect(warmDashboard).toHaveBeenCalledWith({});
    expect(warmKpis).toHaveBeenCalledWith({});
    expect(result).toMatchObject({ processed: 5, success: 5, failure: 0 });
    expect(result.details).toEqual({ reports_warmed: 3, kpis_warmed: 2 });
  });
});
