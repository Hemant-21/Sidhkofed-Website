'use client';

/**
 * Dashboard Report Status (Phase 15.2) — the FIXED report catalog with each
 * report's publication state + homepage visibility (`GET /admin/dashboard/reports`).
 * Read-only: reports are a fixed, code-referenced set (no builder). Lets an admin
 * see at a glance which public dashboard reports are live.
 */

import { BarChart3, Eye, EyeOff } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { SkeletonText } from '@/components/feedback/skeleton';
import { useDashboardReports } from '../hooks';
import { DashboardCard } from './cards';

export function ReportStatus() {
  const { data, isLoading, error, refetch } = useDashboardReports({
    page: 1,
    page_size: 100,
    ordering: 'display_order',
  });

  return (
    <DashboardCard
      title="Dashboard Reports"
      description="Fixed public reports and their publication state"
      icon={BarChart3}
      error={error}
      onRetry={() => refetch()}
    >
      {isLoading ? (
        <SkeletonText lines={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={BarChart3} title="No reports configured" />
      ) : (
        <ul className="divide-y divide-border">
          {data.items.map((report) => (
            <li key={report.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                {report.public_visibility ? (
                  <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Public" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Hidden from public" />
                )}
                <span className="truncate text-sm text-foreground">{report.title_en}</span>
              </div>
              <StatusBadge state={report.publication_state} />
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
