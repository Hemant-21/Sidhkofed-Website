'use client';

/**
 * Audit Log detail page. A fully READ-ONLY presentation of one audit entry (API spec §6: "Audit is
 * read-only. Never allow editing."). Shows the actor, timestamp, module, entity, the
 * previous → new state transition, the change summary, and the raw metadata (before/after context
 * the backend chose to record). There are NO edit affordances anywhere. Super Admin only.
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { usePermissions } from '@/hooks/use-permissions';
import { ROLE_KEYS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { formatDateTime } from '@/utils/date';
import { humanize } from '@/utils/format';
import { useAuditDetail } from './hooks';
import { AuditActionBadge } from './components/audit-action-badge';

export function AuditDetailPage({ id }: { id: string }) {
  const { hasRole } = usePermissions();
  const isSuperAdmin = hasRole(ROLE_KEYS.superAdmin);
  const detail = useAuditDetail(id, isSuperAdmin);
  const entry = detail.data;

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit entry" breadcrumbs={crumbs('Detail')} />
        <ForbiddenState
          title="Restricted to Super Admin"
          description="Audit entries are available to Super Administrators only."
        />
      </div>
    );
  }

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !entry) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit entry" breadcrumbs={crumbs('Detail')} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  const metadataText =
    entry.metadata != null ? JSON.stringify(entry.metadata, null, 2) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit entry"
        description={`${humanize(entry.module)} · ${formatDateTime(entry.created_at)}`}
        breadcrumbs={crumbs('Detail')}
      />

      <div className="flex flex-wrap items-center gap-2">
        <AuditActionBadge action={entry.action} />
        <Badge tone="default">{humanize(entry.module)}</Badge>
        {entry.event ? <Badge tone="info">{entry.event}</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Overview" />
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Action">{humanize(entry.action)}</Item>
                <Item label="Module">{humanize(entry.module)}</Item>
                <Item label="Timestamp">{formatDateTime(entry.created_at)}</Item>
                <Item label="Entity ID">
                  {entry.record_id ? (
                    <code className="break-all text-xs">{entry.record_id}</code>
                  ) : (
                    '—'
                  )}
                </Item>
                <Item label="Previous state">
                  {entry.previous_state ? humanize(entry.previous_state) : '—'}
                </Item>
                <Item label="New state">{entry.new_state ? humanize(entry.new_state) : '—'}</Item>
                <Item label="Change summary" full>
                  {entry.change_summary ?? entry.event ?? '—'}
                </Item>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Metadata"
              description="Read-only context recorded with this action (before/after, request info)."
            />
            <CardContent>
              {metadataText ? (
                <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs text-foreground">
                  {metadataText}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No additional metadata recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Actor" />
            <CardContent className="text-sm">
              {entry.user ? (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{entry.user.full_name}</p>
                  <p className="text-muted-foreground">{entry.user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    <code className="break-all">{entry.user.id}</code>
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">System / anonymous action.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href={ROUTES.auditLog} className="inline-flex items-center gap-1 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to audit log
        </Link>
      </p>
    </div>
  );
}

const crumbs = (label: string) => [{ label: 'Audit Log', href: ROUTES.auditLog }, { label }];

function Item({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-72" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
