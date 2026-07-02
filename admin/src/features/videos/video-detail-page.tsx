'use client';

/**
 * Video detail / view page. Read-only presentation of one video: a lazy YouTube embed preview,
 * bilingual metadata, publishing state, and lifecycle actions. Loading/error states are the shared
 * components. The embed only uses the backend-derived `youtube_id` (safe; no raw HTML injection).
 */

import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { formatDate } from '@/utils/date';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { VIDEOS_RESOURCE } from './api';
import type { Video } from './types';
import { VideoEmbed } from './components/video-embed';
import { VideoLifecycleActions } from './components/video-lifecycle-actions';

export function VideoDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<Video>(VIDEOS_RESOURCE, id);
  const video = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !video) {
    return (
      <div className="space-y-6">
        <PageHeader title="Video" breadcrumbs={[{ label: 'Videos', href: ROUTES.videos }, { label: 'Detail' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={video.title_en}
        description={video.title_hi ?? undefined}
        breadcrumbs={[{ label: 'Videos', href: ROUTES.videos }, { label: video.title_en }]}
        actions={<VideoLifecycleActions video={video} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={video.publication_state} />
        {video.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent>
              <VideoEmbed youtubeId={video.youtube_id} title={video.title_en} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Description" />
            <CardContent>
              <Tabs defaultValue="en">
                <TabsList>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <ContentBlock body={video.description_en} />
                </TabsContent>
                <TabsContent value="hi">
                  <ContentBlock body={video.description_hi} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardContent>
              <dl className="space-y-3 text-sm">
                <Item label="YouTube ID">{video.youtube_id}</Item>
                <Item label="Source URL">
                  <a href={video.youtube_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-primary hover:underline">
                    Open on YouTube <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </Item>
                <Item label="Display order">{video.display_order ?? '—'}</Item>
                <Item label="Created">{formatDate(video.created_at)}</Item>
                <Item label="Published">{video.published_at ? formatDate(video.published_at) : '—'}</Item>
              </dl>
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
      <dd className="mt-0.5 text-foreground">{children}</dd>
    </div>
  );
}

function ContentBlock({ body }: { body: string | null }) {
  return body ? (
    <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{body}</pre>
  ) : (
    <p className="text-sm text-muted-foreground">No description provided.</p>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-72" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
