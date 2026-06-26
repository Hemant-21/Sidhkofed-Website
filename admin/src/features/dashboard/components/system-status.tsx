'use client';

/**
 * System Status (Phase 15.2) — reports ONLY backend-supported status, never an
 * invented health check (task constraint). It shows:
 *   • Dashboard reports: how many fixed reports are published (from the reports API).
 *   • Global search: enabled + the number of searchable content surfaces (the FTS
 *     contract — the exact surfaces the backend indexes).
 * Scheduler / background-job internals have no public status endpoint, so we say so
 * plainly rather than fabricate a green/red light.
 */

import { ServerCog } from 'lucide-react';
import { SkeletonText } from '@/components/feedback/skeleton';
import { CONTENT_TYPES } from '@/types/search';
import { useDashboardReports } from '../hooks';
import { DashboardCard, InfoCard, StatusRow } from './cards';

export function SystemStatus() {
  const { data, isLoading, error, refetch } = useDashboardReports({ page: 1, page_size: 100 });

  const total = data?.pagination.total_items ?? 0;
  const published = (data?.items ?? []).filter((r) => r.publication_state === 'published').length;

  return (
    <DashboardCard
      title="System Status"
      description="Backend-reported status only"
      icon={ServerCog}
      error={error}
      onRetry={() => refetch()}
    >
      {isLoading ? (
        <SkeletonText lines={3} />
      ) : (
        <>
          <ul className="divide-y divide-border">
            <StatusRow
              label="Public dashboard reports"
              description={`${published} published of ${total}`}
              value={published > 0 ? 'Live' : 'None published'}
              tone={published > 0 ? 'success' : 'warning'}
            />
            <StatusRow
              label="Global search"
              description={`${CONTENT_TYPES.length} searchable content surfaces`}
              value="Enabled"
              tone="success"
            />
          </ul>
          <div className="mt-4">
            <InfoCard>
              Scheduler and background jobs (scheduled publishing, status recalculation, highlight
              expiry) run server-side and expose no public status endpoint.
            </InfoCard>
          </div>
        </>
      )}
    </DashboardCard>
  );
}
