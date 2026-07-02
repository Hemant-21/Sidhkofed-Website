'use client';

/**
 * Tender detail / view page. GeM URL opens in a new tab — never proxied, embedded, or
 * processed. Frontend is INFORMATIONAL only. Expired tenders remain visible unless manually
 * unpublished/archived (codex §4.7).
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
import { TENDERS_RESOURCE } from './api';
import type { TenderDetail } from './types';
import { TenderLifecycleActions } from './components/tender-lifecycle-actions';

const STATUS_TONE: Record<string, 'success' | 'muted' | 'danger' | 'default'> = {
  open: 'success',
  closed: 'muted',
  cancelled: 'danger',
  awarded: 'default',
};

export function TenderDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<TenderDetail>(TENDERS_RESOURCE, id);
  const tender = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !tender) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tender"
          breadcrumbs={[{ label: 'Tenders', href: ROUTES.tenders }, { label: 'Detail' }]}
        />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tender.title_en}
        description={tender.title_hi ?? undefined}
        breadcrumbs={[{ label: 'Tenders', href: ROUTES.tenders }, { label: tender.title_en }]}
        actions={<TenderLifecycleActions tender={tender} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={tender.publication_state} />
        {tender.tender_type ? <Badge tone="default">{tender.tender_type.name_en}</Badge> : null}
        {tender.tender_status ? (
          <Badge tone={STATUS_TONE[tender.tender_status] ?? 'default'}>
            {tender.tender_status.charAt(0).toUpperCase() + tender.tender_status.slice(1)}
          </Badge>
        ) : null}
        {tender.highlight_type ? <HighlightBadge highlight={tender.highlight_type} /> : null}
        {tender.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
        {!tender.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Tender details" />
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Tender number">{tender.tender_number ?? '—'}</Item>
                <Item label="Type">{tender.tender_type?.name_en ?? '—'}</Item>
                <Item label="Publish date">{formatDate(tender.publish_date)}</Item>
                <Item label="Submission deadline">{formatDate(tender.submission_deadline)}</Item>
                <Item label="Opening date">{formatDate(tender.opening_date)}</Item>
              </dl>
            </CardContent>
          </Card>

          {tender.summary_en || tender.summary_hi ? (
            <Card>
              <CardHeader title="Summary" />
              <CardContent>
                <Tabs defaultValue="en">
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en">
                    <Block body={tender.summary_en} />
                  </TabsContent>
                  <TabsContent value="hi">
                    <Block body={tender.summary_hi} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {tender.gem_url ? (
            <Card>
              <CardHeader title="GeM portal" />
              <CardContent>
                <a
                  href={tender.gem_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  aria-label={`Open tender on GeM portal (opens in new tab)`}
                >
                  View on GeM <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  BOQ, corrigenda, clarifications, and tender files remain on GeM.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Public URL</p>
              <a
                href={tender.public_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {tender.public_url}{' '}
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
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
