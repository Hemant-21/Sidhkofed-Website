'use client';

/**
 * Recent Activity (Phase 15.2) — the latest administrative actions from the audit
 * log (`GET /admin/audit-logs`). The audit log is Super Admin only (API spec §8),
 * so for other roles this renders an honest "restricted" note instead of calling
 * the endpoint and surfacing a 403. Activity is never invented: every row is a
 * real audited action.
 */

import { Activity, History, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { SkeletonText } from '@/components/feedback/skeleton';
import { ROLE_KEYS } from '@/constants/permissions';
import { usePermissions } from '@/hooks/use-permissions';
import { formatRelative } from '@/utils/date';
import { humanize } from '@/utils/format';
import type { AuditLogEntry } from '@/types/dashboard';
import { useRecentActivity } from '../hooks';
import { DashboardCard, InfoCard } from './cards';

/** Lifecycle/state actions get a tone; everything else is neutral. */
function actionTone(action: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  if (/publish|create|restore/i.test(action)) return 'success';
  if (/unpublish|archive/i.test(action)) return 'warning';
  if (/delete|fail/i.test(action)) return 'danger';
  if (/login|update|replace/i.test(action)) return 'info';
  return 'default';
}

function ActivityRow({ entry }: { entry: AuditLogEntry }) {
  const summary = entry.change_summary ?? entry.event ?? humanize(entry.action);
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Badge tone={actionTone(entry.action)} className="mt-0.5 shrink-0">
        {humanize(entry.action)}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{summary}</p>
        <p className="truncate text-xs text-muted-foreground">
          {humanize(entry.module)}
          {entry.user ? ` · ${entry.user.full_name}` : ''} · {formatRelative(entry.created_at)}
        </p>
      </div>
    </li>
  );
}

export function RecentActivity({ limit = 8 }: { limit?: number }) {
  const { hasRole } = usePermissions();
  const isSuperAdmin = hasRole(ROLE_KEYS.superAdmin);

  const { data, isLoading, isFetching, error, refetch } = useRecentActivity(
    { page: 1, page_size: limit, ordering: '-created_at' },
    isSuperAdmin,
  );

  if (!isSuperAdmin) {
    return (
      <DashboardCard title="Recent Activity" icon={History}>
        <InfoCard title="Restricted to Super Admin">
          The audit log of recent administrative actions is available to Super Administrators only.
        </InfoCard>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Recent Activity"
      description="Latest audited administrative actions"
      icon={History}
      error={error}
      onRetry={() => refetch()}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          isLoading={isFetching && !isLoading}
          aria-label="Refresh recent activity"
          leftIcon={<RefreshCw className="h-4 w-4" />}
        />
      }
    >
      {isLoading ? (
        <SkeletonText lines={5} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={Activity} title="No recent activity" description="Administrative actions will appear here as they happen." />
      ) : (
        <ul className="divide-y divide-border">
          {data.items.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
