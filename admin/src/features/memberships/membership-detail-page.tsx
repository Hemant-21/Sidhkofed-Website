'use client';

/**
 * Institutional Membership detail / view page. Read-only presentation of one membership plus the
 * lifecycle actions. Institution directory data only — no personal, voting, or dividend data
 * (codex §4.15). Internal notes are shown to admins but never appear on the public directory.
 */

import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { formatDate } from '@/utils/date';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { MEMBERSHIPS_RESOURCE } from './api';
import {
  MEMBERSHIP_LEVEL_LABEL,
  MEMBERSHIP_TYPE_LABEL,
  MEMBERSHIP_STATUS_LABEL,
  type MembershipDetail,
} from './types';
import { MembershipLifecycleActions } from './components/membership-lifecycle-actions';

export function MembershipDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<MembershipDetail>(MEMBERSHIPS_RESOURCE, id);
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
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  const title = membership.institution?.name_en ?? 'Membership';

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
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
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function Block({ body }: { body: string | null }) {
  if (!body) return <p className="text-sm text-muted-foreground">—</p>;
  return <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{body}</pre>;
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
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
