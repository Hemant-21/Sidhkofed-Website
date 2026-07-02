import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { ProgrammeSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, yearOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { ProgrammeCard } from '@/components/cards/programme-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Programmes & schemes',
  description: 'Programmes and schemes supporting cooperative livelihoods and value chains.',
  path: '/programmes',
});

type SP = Record<string, string | string[] | undefined>;

export default async function ProgrammesPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const list = await getListSafe<ProgrammeSummary>(PUBLIC_ENDPOINTS.programmes, {
    query: {
      page,
      page_size: PAGE_SIZE,
      search: qstr(searchParams.search),
      year: qstr(searchParams.year),
      ordering: 'display_order',
    },
  });

  return (
    <ListingLayout
      titleKey="page.programmes.title"
      subtitleKey="page.programmes.subtitle"
      crumb="Programmes"
      filters={<FilterBar selects={[{ key: 'year', labelKey: 'filter.year', options: yearOptions() }]} />}
      summary={<ResultsSummary total={list.pagination.total_items} />}
      pagination={<PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />}
    >
      {list.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map((programme) => (
            <ProgrammeCard key={programme.id} programme={programme} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
