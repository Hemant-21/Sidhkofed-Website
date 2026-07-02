import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { Video } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { VideoCard } from '@/components/cards/video-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Videos',
  description: 'Videos from SIDHKOFED activities and events.',
  path: '/publications/media/videos',
});

type SP = Record<string, string | string[] | undefined>;

export default async function VideosListPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const list = await getListSafe<Video>(PUBLIC_ENDPOINTS.videos, {
    query: { page, page_size: PAGE_SIZE, ordering: 'display_order' },
  });

  return (
    <ListingLayout
      titleKey="page.publications.media.videos.title"
      subtitleKey="page.publications.media.videos.subtitle"
      crumb="Videos"
      parentCrumbs={[
        { label: 'Publications', href: '/publications' },
        { label: 'Media Gallery', href: '/publications/media' },
      ]}
      summary={<ResultsSummary total={list.pagination.total_items} />}
      pagination={<PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />}
    >
      {list.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.items.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
