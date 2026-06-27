import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { CommunicationSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions, yearOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { CommunicationCard } from '@/components/cards/communication-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Official communications',
  description: 'Notices, circulars, office orders, notifications and advisories.',
  path: '/official-communications',
});

type SP = Record<string, string | string[] | undefined>;

export default async function CommunicationsPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, communicationTypes] = await Promise.all([
    getListSafe<CommunicationSummary>(PUBLIC_ENDPOINTS.communications, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        communication_type: qstr(searchParams.communication_type),
        year: qstr(searchParams.year),
        ordering: '-issue_date',
      },
    }),
    getMasterOptions('communication-types'),
  ]);

  return (
    <ListingLayout
      titleKey="page.communications.title"
      subtitleKey="page.communications.subtitle"
      crumb="Official communications"
      filters={
        <FilterBar
          selects={[
            { key: 'communication_type', labelKey: 'filter.type', options: communicationTypes },
            { key: 'year', labelKey: 'filter.year', options: yearOptions() },
          ]}
        />
      }
      summary={<ResultsSummary total={list.pagination.total_items} />}
      pagination={<PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />}
    >
      {list.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.items.map((item) => (
            <CommunicationCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
