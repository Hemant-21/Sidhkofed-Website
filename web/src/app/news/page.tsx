import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { NewsSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, yearOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { NewsCard } from '@/components/cards/news-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'News',
  description: 'Updates and stories from completed activities and announcements.',
  path: '/news',
});

type SP = Record<string, string | string[] | undefined>;

export default async function NewsPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const list = await getListSafe<NewsSummary>(PUBLIC_ENDPOINTS.news, {
    query: {
      page,
      page_size: PAGE_SIZE,
      search: qstr(searchParams.search),
      year: qstr(searchParams.year),
      ordering: '-news_published_at',
    },
  });

  return (
    <ListingLayout
      titleKey="page.news.title"
      subtitleKey="page.news.subtitle"
      crumb="News"
      filters={<FilterBar selects={[{ key: 'year', labelKey: 'filter.year', options: yearOptions() }]} />}
      summary={<ResultsSummary total={list.pagination.total_items} />}
      pagination={<PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />}
    >
      {list.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map((news) => (
            <NewsCard key={news.id} news={news} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
