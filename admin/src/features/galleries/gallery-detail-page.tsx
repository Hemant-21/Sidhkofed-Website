'use client';

/**
 * Gallery detail / view page. Read-only presentation of the gallery plus lifecycle actions and the
 * full image management surface (add/remove/reorder/caption/alt-text/order). Bilingual description in
 * tabs.
 */

import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { GALLERIES_RESOURCE } from './api';
import type { GalleryDetail } from './types';
import { GalleryLifecycleActions } from './components/gallery-lifecycle-actions';
import { GalleryImageManager } from './components/gallery-image-manager';

export function GalleryDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<GalleryDetail>(GALLERIES_RESOURCE, id);
  const gallery = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !gallery) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gallery"
          breadcrumbs={[{ label: 'Galleries', href: ROUTES.galleries }, { label: 'Detail' }]}
        />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={gallery.title_en}
        description={gallery.title_hi ?? undefined}
        breadcrumbs={[{ label: 'Galleries', href: ROUTES.galleries }, { label: gallery.title_en }]}
        actions={<GalleryLifecycleActions gallery={gallery} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={gallery.publication_state} />
        <Badge tone="muted">{gallery.image_count} image(s)</Badge>
        {gallery.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
        {!gallery.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {gallery.description_en || gallery.description_hi ? (
            <Card>
              <CardHeader title="Description" />
              <CardContent>
                <Tabs defaultValue="en">
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en">
                    <Block body={gallery.description_en} />
                  </TabsContent>
                  <TabsContent value="hi">
                    <Block body={gallery.description_hi} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="pt-6">
              <GalleryImageManager gallery={gallery} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Cover image" />
            <CardContent>
              {gallery.cover_media?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={gallery.cover_media.url}
                  alt={gallery.cover_media.alt_text ?? ''}
                  className="w-full rounded-md border border-border object-cover"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No cover image set.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Public URL</p>
              <a
                href={`/galleries/${gallery.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                /galleries/{gallery.slug} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
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
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
