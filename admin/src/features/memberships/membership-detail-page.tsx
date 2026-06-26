'use client';

/**
<<<<<<< HEAD
 * Membership detail / view page. Read-only presentation of one membership plus lifecycle actions.
 */

=======
 * Institutional Membership detail / view page. Read-only presentation of one membership plus the
 * lifecycle actions. Institution directory data only — no personal, voting, or dividend data
 * (codex §4.15). Internal notes are shown to admins but never appear on the public directory.
 */

import { ExternalLink } from 'lucide-react';
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
<<<<<<< HEAD
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useCrudDetail } from '@/hooks/crud';
import { formatDate } from '@/utils/date';
=======
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { formatDate } from '@/utils/date';
import { useCrudDetail } from '@/hooks/crud';
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
import { ROUTES } from '@/constants/routes';
import { MEMBERSHIPS_RESOURCE } from './api';
import {
  MEMBERSHIP_LEVEL_LABEL,
  MEMBERSHIP_TYPE_LABEL,
<<<<<<< HEAD
  type MembershipDetail,
  type MembershipLevel,
  type MembershipType,
=======
  MEMBERSHIP_STATUS_LABEL,
  type MembershipDetail,
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
} from './types';
import { MembershipLifecycleActions } from './components/membership-lifecycle-actions';

export function MembershipDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<MembershipDetail>(MEMBERSHIPS_RESOURCE, id);
<<<<<<< HEAD
  const m = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !m) {
    return (
      <div className="space-y-6">
        <PageHeader title="Membership" breadcrumbs={[{ label: 'Memberships', href: ROUTES.memberships }, { label: 'Detail' }]} />
=======
  const membership = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !membership) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Membership"
          breadcrumbs={[
            { label: 'Institutional Membership', href: ROUTES.memberships },
            { label: 'Detail' },
          ]}
        />
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

<<<<<<< HEAD
  const title = m.institution?.name_en ?? 'Membership';
=======
  const title = membership.institution?.name_en ?? 'Membership';
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
<<<<<<< HEAD
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
=======
        description={
          membership.membership_number ? `Membership no. ${membership.membership_number}` : undefined
        }
        breadcrumbs={[
          { label: 'Institutional Membership', href: ROUTES.memberships },
          { label: title },
        ]}
        actions={<MembershipLifecycleActions membership={membership} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={membership.publication_state} />
        <Badge tone={membership.membership_level === 'sidhkofed' ? 'info' : 'default'}>
          {MEMBERSHIP_LEVEL_LABEL[membership.membership_level]}
        </Badge>
        <Badge tone="default">{MEMBERSHIP_TYPE_LABEL[membership.membership_type]}</Badge>
        <Badge tone={membership.status === 'active' ? 'success' : 'muted'}>
          {MEMBERSHIP_STATUS_LABEL[membership.status]}
        </Badge>
        {membership.highlight_type ? <HighlightBadge highlight={membership.highlight_type} /> : null}
        {membership.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
        {!membership.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Overview" />
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Institution">{membership.institution?.name_en ?? '—'}</Item>
                <Item label="Membership number">{membership.membership_number ?? '—'}</Item>
                <Item label="Membership level">
                  {MEMBERSHIP_LEVEL_LABEL[membership.membership_level]}
                </Item>
                <Item label="Membership type">
                  {MEMBERSHIP_TYPE_LABEL[membership.membership_type]}
                </Item>
                <Item label="District">{membership.district?.name_en ?? '—'}</Item>
                <Item label="District Union">{membership.district_union?.name_en ?? '—'}</Item>
                <Item label="Reporting period">{membership.reporting_period?.name_en ?? '—'}</Item>
                <Item label="Join date">{formatDate(membership.join_date)}</Item>
                <Item label="Status">{MEMBERSHIP_STATUS_LABEL[membership.status]}</Item>
                <Item label="Display order">
                  {membership.display_order != null ? membership.display_order : '—'}
                </Item>
              </dl>
            </CardContent>
          </Card>

          {membership.notes_en || membership.notes_hi ? (
            <Card>
              <CardHeader title="Internal notes" description="Not shown publicly." />
              <CardContent>
                <Tabs defaultValue="en">
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en">
                    <Block body={membership.notes_en} />
                  </TabsContent>
                  <TabsContent value="hi">
                    <Block body={membership.notes_hi} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Public directory URL</p>
              <a
                href={`/memberships/${membership.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                /memberships/{membership.slug}{' '}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
<<<<<<< HEAD
      <dd className="text-sm text-foreground">{children}</dd>
=======
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
    </div>
  );
}

<<<<<<< HEAD
=======
function Block({ body }: { body: string | null }) {
  if (!body) return <p className="text-sm text-muted-foreground">—</p>;
  return <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{body}</pre>;
}

>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-72" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
      </div>
<<<<<<< HEAD
      <Skeleton className="h-48 w-full" />
=======
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
    </div>
  );
}
