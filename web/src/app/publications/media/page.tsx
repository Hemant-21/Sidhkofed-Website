import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Images, Video as VideoIcon } from 'lucide-react';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { GallerySummary, Video } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/feedback/states';
import { GalleryCard } from '@/components/cards/gallery-card';
import { VideoCard } from '@/components/cards/video-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Media Gallery',
  description: 'Photo galleries and videos from SIDHKOFED activities and events.',
  path: '/publications/media',
});

// hero-slides is an internal homepage gallery, not a public media gallery entry.
const INTERNAL_GALLERY_SLUGS = new Set(['hero-slides']);

export default async function MediaGalleryPage() {
  const [galleriesRaw, videos] = await Promise.all([
    getListSafe<GallerySummary>(PUBLIC_ENDPOINTS.galleries, {
      query: { page_size: 9, ordering: 'display_order' },
    }),
    getListSafe<Video>(PUBLIC_ENDPOINTS.videos, {
      query: { page_size: 8, ordering: 'display_order' },
    }),
  ]);

  const internalInBatch = galleriesRaw.items.filter((g) => INTERNAL_GALLERY_SLUGS.has(g.slug)).length;
  const totalGalleries = Math.max(0, galleriesRaw.pagination.total_items - internalInBatch);
  const totalVideos = videos.pagination.total_items;

  const galleries = {
    ...galleriesRaw,
    items: galleriesRaw.items.filter((g) => !INTERNAL_GALLERY_SLUGS.has(g.slug)).slice(0, 8),
  };

  return (
    <>
      <Breadcrumbs
        items={[{ label: 'Publications', href: '/publications' }, { label: 'Media Gallery' }]}
      />

      <div className="bg-primary">
        <Container className="py-10 sm:py-14">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Media Gallery</h1>
          <p className="mt-2 max-w-2xl text-base text-white/70">
            Photo and video archive of SIDHKOFED activities, events and programmes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white">
              <Images className="h-4 w-4" aria-hidden="true" />
              {totalGalleries} {totalGalleries === 1 ? 'Gallery' : 'Galleries'}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white">
              <VideoIcon className="h-4 w-4" aria-hidden="true" />
              {totalVideos} {totalVideos === 1 ? 'Video' : 'Videos'}
            </div>
          </div>
        </Container>
      </div>

      {/* Photo Galleries */}
      <Container className="py-10">
        <div className="flex items-center justify-between gap-4">
          <SectionHeading title="Photo Galleries" />
          {galleries.pagination.total_items > 8 && (
            <Link
              href="/publications/media/galleries"
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>

        {galleries.items.length === 0 ? (
          <EmptyState title="No galleries yet" body="Photo galleries will appear here once published." />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {galleries.items.map((gallery) => (
              <GalleryCard key={gallery.id} gallery={gallery} />
            ))}
          </div>
        )}
      </Container>

      {/* Videos */}
      <div className="border-t border-border bg-muted/30">
        <Container className="py-10">
          <div className="flex items-center justify-between gap-4">
            <SectionHeading title="Videos" />
            {videos.pagination.total_items > 8 && (
              <Link
                href="/publications/media/videos"
                className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>

          {videos.items.length === 0 ? (
            <EmptyState title="No videos yet" body="Videos will appear here once published." />
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {videos.items.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </Container>
      </div>
    </>
  );
}
