'use client';

/**
 * Page detail / view page. Read-only presentation of one page plus the lifecycle actions.
 * Bilingual content and SEO meta in tabs. Body is rendered as escaped plain text (no raw HTML
 * injection) — content only, no page builder.
 */

import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { PAGES_RESOURCE } from './api';
import type { PageDetail } from './types';
import { PageLifecycleActions } from './components/page-lifecycle-actions';

export function PageDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<PageDetail>(PAGES_RESOURCE, id);
  const page = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !page) {
    return (
      <div className="space-y-6">
        <PageHeader title="Page" breadcrumbs={[{ label: 'Pages', href: ROUTES.pages }, { label: 'Detail' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={page.title_en}
        description={page.title_hi ?? undefined}
        breadcrumbs={[{ label: 'Pages', href: ROUTES.pages }, { label: page.title_en }]}
        actions={<PageLifecycleActions page={page} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={page.publication_state} />
        {page.highlight_type ? <HighlightBadge highlight={page.highlight_type} /> : null}
        {page.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
        {!page.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
        <Badge tone="muted">/{page.slug}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Body" />
            <CardContent>
              <Tabs defaultValue="en">
                <TabsList>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <Block body={page.body_en} />
                </TabsContent>
                <TabsContent value="hi">
                  <Block body={page.body_hi} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {page.meta_title_en ||
          page.meta_title_hi ||
          page.meta_description_en ||
          page.meta_description_hi ? (
            <Card>
              <CardHeader title="SEO metadata" />
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Item label="Meta title (EN)">{page.meta_title_en ?? '—'}</Item>
                  <Item label="Meta title (HI)">{page.meta_title_hi ?? '—'}</Item>
                  <Item label="Meta description (EN)">{page.meta_description_en ?? '—'}</Item>
                  <Item label="Meta description (HI)">{page.meta_description_hi ?? '—'}</Item>
                </dl>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Public URL</p>
              <a
                href={page.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {page.public_url} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
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
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
