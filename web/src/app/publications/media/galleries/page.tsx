import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { GallerySummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { GalleryCard } from '@/components/cards/gallery-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Photo Galleries',
  description: 'Photo galleries from SIDHKOFED activities and events.',
  path: '/publications/media/galleries',
});

type SP = Record<string, string | string[] | undefined>;

const INTERNAL_GALLERY_SLUGS = new Set(['hero-slides']);

export default async function GalleriesListPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const raw = await getListSafe<GallerySummary>(PUBLIC_ENDPOINTS.galleries, {
    query: { page, page_size: PAGE_SIZE + 1, ordering: 'display_order' },
  });

  const list = {
    ...raw,
    items: raw.items.filter((g) => !INTERNAL_GALLERY_SLUGS.has(g.slug)).slice(0, PAGE_SIZE),
  };

  return (
    <ListingLayout
      titleKey="page.publications.media.galleries.title"
      subtitleKey="page.publications.media.galleries.subtitle"
      crumb="Photo Galleries"
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
          {list.items.map((gallery) => (
            <GalleryCard key={gallery.id} gallery={gallery} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
