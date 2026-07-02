'use client';

/**
 * Toolkit detail / view page. Read-only presentation of one toolkit plus the lifecycle actions, the
 * catalogue items manager (nested CRUD), and a link to the read-only distribution summary. Bilingual
 * content shows in tabs. Linked references use the compact shapes the backend returns. Loading/error
 * states are the shared components.
 */

import Link from 'next/link';
import { ExternalLink, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { TOOLKITS_RESOURCE } from './api';
import type { ToolkitDetail } from './types';
import { ToolkitLifecycleActions } from './components/toolkit-lifecycle-actions';
import { ToolkitItemsManager } from './components/toolkit-items-manager';

export function ToolkitDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<ToolkitDetail>(TOOLKITS_RESOURCE, id);
  const toolkit = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !toolkit) {
    return (
      <div className="space-y-6">
        <PageHeader title="Toolkit" breadcrumbs={[{ label: 'Toolkits', href: ROUTES.toolkits }, { label: 'Detail' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={toolkit.title_en}
        description={toolkit.title_hi ?? undefined}
        breadcrumbs={[{ label: 'Toolkits', href: ROUTES.toolkits }, { label: toolkit.title_en }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`${ROUTES.toolkits}/${toolkit.id}/distributions`}>
                <BarChart3 className="h-4 w-4" aria-hidden="true" /> Distribution summary
              </Link>
            </Button>
            <ToolkitLifecycleActions toolkit={toolkit} />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={toolkit.publication_state} />
        {toolkit.programme ? <Badge tone="default">{toolkit.programme.title_en}</Badge> : null}
        {toolkit.commodity ? <Badge tone="default">{toolkit.commodity.name_en}</Badge> : null}
        {toolkit.highlight_type ? <HighlightBadge highlight={toolkit.highlight_type} /> : null}
        {toolkit.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
        {!toolkit.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Content" />
            <CardContent>
              <Tabs defaultValue="en">
                <TabsList>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <Block label="Summary" body={toolkit.summary_en} />
                  <Block label="Description" body={toolkit.description_en} />
                </TabsContent>
                <TabsContent value="hi">
                  <Block label="सारांश" body={toolkit.summary_hi} />
                  <Block label="विवरण" body={toolkit.description_hi} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <ToolkitItemsManager toolkit={toolkit} />
        </div>

        <div className="space-y-6">
          {toolkit.cover_media?.url ? (
            <Card>
              <CardHeader title="Cover image" />
              <CardContent>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toolkit.cover_media.url}
                  alt={toolkit.cover_media.alt_text ?? toolkit.title_en}
                  className="w-full rounded-md object-cover"
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Linkage" />
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Programme / scheme</p>
                <p className="text-foreground">{toolkit.programme?.title_en ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Commodity</p>
                <p className="text-foreground">{toolkit.commodity?.name_en ?? '—'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Public URL</p>
              <a
                href={toolkit.public_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {toolkit.public_url} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Block({ label, body }: { label: string; body: string | null }) {
  if (!body) return null;
  return (
    <div className="mb-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{body}</pre>
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
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
