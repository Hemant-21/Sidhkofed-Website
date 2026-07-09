'use client';

/**
 * Leadership detail / view page. Read-only presentation plus lifecycle actions.
 */

import { UserRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { LEADERSHIP_RESOURCE } from './api';
import type { LeadershipDetail } from './types';
import { LeadershipLifecycleActions } from './components/leadership-lifecycle-actions';

export function LeadershipDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<LeadershipDetail>(LEADERSHIP_RESOURCE, id);
  const leader = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !leader) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Leadership entry"
          breadcrumbs={[{ label: 'Leadership', href: ROUTES.leadership }, { label: 'Detail' }]}
        />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={leader.name_en}
        description={leader.name_hi ?? undefined}
        breadcrumbs={[{ label: 'Leadership', href: ROUTES.leadership }, { label: leader.name_en }]}
        actions={<LeadershipLifecycleActions leader={leader} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={leader.publication_state} />
        {leader.highlight_type ? <HighlightBadge highlight={leader.highlight_type} /> : null}
        {!leader.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Profile" />
            <CardContent>
              <div className="flex items-start gap-4">
                {leader.photo?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={leader.photo.url}
                    alt={leader.photo.alt_text ?? ''}
                    className="h-16 w-16 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border text-muted-foreground">
                    <UserRound className="h-7 w-7" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 space-y-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Government role
                    </p>
                    <p className="text-foreground">{leader.govt_role_en}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      SIDHKOFED role
                    </p>
                    <p className="text-foreground">{leader.sidhkofed_role_en}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <CardContent>
              <Tabs defaultValue="en">
                <TabsList>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <div className="space-y-3">
                    <Field label="Name" value={leader.name_en} />
                    <Field label="Government role" value={leader.govt_role_en} />
                    <Field label="SIDHKOFED role" value={leader.sidhkofed_role_en} />
                  </div>
                </TabsContent>
                <TabsContent value="hi">
                  <div className="space-y-3">
                    <Field label="Name" value={leader.name_hi} />
                    <Field label="Government role" value={leader.govt_role_hi} />
                    <Field label="SIDHKOFED role" value={leader.sidhkofed_role_hi} />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Identifier</p>
              <code className="break-all text-foreground">{leader.slug}</code>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {value ? <p className="text-sm text-foreground">{value}</p> : <p className="text-sm text-muted-foreground">—</p>}
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
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
