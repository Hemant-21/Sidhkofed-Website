'use client';

/**
 * News detail / view page. Read-only presentation of one news record + its lifecycle actions and a
 * link back to the source event. Bilingual content in tabs; HTML body rendered as escaped text.
 */

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { formatDate, formatDateTime } from '@/utils/date';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { NEWS_RESOURCE } from './api';
import type { NewsDetail } from './types';
import { NewsLifecycleActions } from './components/news-lifecycle-actions';

export function NewsDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<NewsDetail>(NEWS_RESOURCE, id);
  const news = detail.data;

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (detail.isError || !news) {
    return (
      <div className="space-y-6">
        <PageHeader title="News" breadcrumbs={[{ label: 'News', href: ROUTES.news }, { label: 'Detail' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={news.title_en}
        description={news.title_hi ?? undefined}
        breadcrumbs={[{ label: 'News', href: ROUTES.news }, { label: news.title_en }]}
        actions={<NewsLifecycleActions news={news} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={news.publication_state} />
        {news.highlight_type ? <HighlightBadge highlight={news.highlight_type} /> : null}
        {news.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
        {news.news_published_at ? <Badge tone="default">Published {formatDate(news.news_published_at)}</Badge> : null}
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
                  <Body summary={news.summary_en} body={news.body_en} />
                </TabsContent>
                <TabsContent value="hi">
                  <Body summary={news.summary_hi} body={news.body_hi} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {news.cover_media ? (
            <Card className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={news.cover_media.url} alt={news.cover_media.alt_text ?? news.title_en} className="aspect-video w-full object-cover" />
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Linked event" />
            <CardContent className="text-sm">
              <Link href={`${ROUTES.events}/${news.source_event.id}`} className="text-primary hover:underline">
                {news.source_event.title_en}
              </Link>
              <p className="mt-1 text-muted-foreground">Type: {news.source_event.event_type}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 text-sm">
              <Row label="Created" value={formatDateTime(news.created_at)} />
              <Row label="Updated" value={formatDateTime(news.updated_at)} />
              <Row label="Published" value={news.published_at ? formatDateTime(news.published_at) : '—'} />
              <div>
                <p className="text-muted-foreground">Public URL</p>
                <a href={news.public_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-primary hover:underline">
                  {news.public_url} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Body({ summary, body }: { summary: string | null; body: string | null }) {
  return (
    <div className="space-y-3">
      {summary ? <p className="text-sm font-medium text-foreground">{summary}</p> : null}
      {body ? (
        <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{body}</pre>
      ) : (
        <p className="text-sm text-muted-foreground">No content provided.</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
