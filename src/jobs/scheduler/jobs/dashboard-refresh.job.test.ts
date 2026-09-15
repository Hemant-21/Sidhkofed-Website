/**
 * Unit test for the dashboard-refresh handler — invalidates then warms the cached public
 * Operational Reports + Website Metrics responses (no new metric computation; it reuses the public
 * services' own cache-population code).
 */
import { describe, it, expect, vi } from 'vitest';
import { runDashboardRefresh } from './dashboard-refresh.job';
import type { JobContext } from '../scheduler.types';
import type { AuditContext } from '@/modules/audit/audit.service';

const actor: AuditContext = { userId: 'sys', authz: { roles: ['super_admin'], permissions: [], isSuperAdmin: true } };
const ctx: JobContext = { actor, now: new Date('2026-06-26T00:00:00Z'), batchSize: 100 };

describe('runDashboardRefresh', () => {
  it('invalidates the cache then warms operational-reports + website-metrics responses', async () => {
    const calls: string[] = [];
    const invalidateOperationalReports = vi.fn(async () => { calls.push('invalidate-operational-reports'); });
    const warmOperationalReports = vi.fn(async () => {
      calls.push('operational-reports');
      return { reports: [{}, {}, {}] as never[] };
    });
    const invalidateWebsiteMetrics = vi.fn(async () => { calls.push('invalidate-website-metrics'); });
    const warmWebsiteMetrics = vi.fn(async (placement: string) => {
      calls.push(`website-metrics:${placement}`);
      return { metrics: placement === 'homepage' ? [{}, {}, {}, {}] : [{}] };
    });

    const result = await runDashboardRefresh(ctx, {
      invalidateOperationalReports,
      warmOperationalReports: warmOperationalReports as never,
      invalidateWebsiteMetrics,
      warmWebsiteMetrics: warmWebsiteMetrics as never,
    });

    expect(calls[0]).toBe('invalidate-operational-reports'); // invalidation happens before warming
    expect(warmOperationalReports).toHaveBeenCalled();
    expect(invalidateWebsiteMetrics).toHaveBeenCalled();
    expect(warmWebsiteMetrics).toHaveBeenCalledWith('homepage');
    expect(warmWebsiteMetrics).toHaveBeenCalledWith('about_us');
    // Website-metrics cache is dropped before it is re-warmed, same ordering as operational reports.
    expect(calls.indexOf('invalidate-website-metrics')).toBeLessThan(calls.indexOf('website-metrics:homepage'));
    expect(result).toMatchObject({ processed: 8, success: 8, failure: 0 });
    expect(result.details).toEqual({ operational_reports_warmed: 3, website_metrics_warmed: 5 });
  });
});
