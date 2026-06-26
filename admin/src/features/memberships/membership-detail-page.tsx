'use client';

/**
 * Membership detail / view page. Read-only presentation of one membership plus lifecycle actions.
 */

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useCrudDetail } from '@/hooks/crud';
import { formatDate } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import { MEMBERSHIPS_RESOURCE } from './api';
import {
  MEMBERSHIP_LEVEL_LABEL,
  MEMBERSHIP_TYPE_LABEL,
  type MembershipDetail,
  type MembershipLevel,
  type MembershipType,
} from './types';
import { MembershipLifecycleActions } from './components/membership-lifecycle-actions';

export function MembershipDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<MembershipDetail>(MEMBERSHIPS_RESOURCE, id);
  const m = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !m) {
    return (
      <div className="space-y-6">
        <PageHeader title="Membership" breadcrumbs={[{ label: 'Memberships', href: ROUTES.memberships }, { label: 'Detail' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  const title = m.institution?.name_en ?? 'Membership';

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={m.membership_number ? `#${m.membership_number}` : undefined}
        breadcrumbs={[{ label: 'Memberships', href: ROUTES.memberships }, { label: title }]}
        actions={<MembershipLifecycleActions membership={m} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={m.publication_state} />
        <Badge tone="default">{MEMBERSHIP_LEVEL_LABEL[m.membership_level as MembershipLevel] ?? m.membership_level}</Badge>
        <Badge tone="default">{MEMBERSHIP_TYPE_LABEL[m.membership_type as MembershipType] ?? m.membership_type}</Badge>
        <Badge tone={m.status === 'active' ? 'success' : 'muted'}>{m.status}</Badge>
        {m.highlight_type ? <HighlightBadge highlight={m.highlight_type} /> : null}
        {m.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
      </div>

      <Card>
        <CardHeader title="Details" />
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <Item label="Institution">{m.institution?.name_en ?? '—'}</Item>
            <Item label="District">{m.district?.name_en ?? '—'}</Item>
            <Item label="District union">{m.district_union?.name_en ?? '—'}</Item>
            <Item label="Reporting period">{m.reporting_period?.name_en ?? '—'}</Item>
            <Item label="Join date">{formatDate(m.join_date)}</Item>
            <Item label="Display order">{m.display_order ?? '—'}</Item>
          </dl>
        </CardContent>
      </Card>

      {m.notes_en || m.notes_hi ? (
        <Card>
          <CardHeader title="Notes" />
          <CardContent className="space-y-3">
            {m.notes_en ? <p className="whitespace-pre-wrap text-sm text-foreground">{m.notes_en}</p> : null}
            {m.notes_hi ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{m.notes_hi}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
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
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
