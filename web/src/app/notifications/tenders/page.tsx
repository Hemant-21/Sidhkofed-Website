import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { TenderSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions, yearOptions, enumOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { TenderCard } from '@/components/cards/tender-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Tenders',
  description: 'Active and past tenders. Tender documents and bidding are managed on GeM.',
  path: '/notifications/tenders',
});

type SP = Record<string, string | string[] | undefined>;

export default async function TendersPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, tenderTypes] = await Promise.all([
    getListSafe<TenderSummary>(PUBLIC_ENDPOINTS.tenders, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        tender_type: qstr(searchParams.tender_type),
        tender_status: qstr(searchParams.tender_status),
        year: qstr(searchParams.year),
        ordering: '-submission_deadline',
      },
    }),
    getMasterOptions('tender-types'),
  ]);

  return (
    <ListingLayout
      titleKey="page.notifications.tenders.title"
      subtitleKey="page.notifications.tenders.subtitle"
      crumb="Tenders"
      parentCrumbs={[{ label: 'Notifications', href: '/notifications' }]}
      filters={
        <FilterBar
          selects={[
            { key: 'tender_type', labelKey: 'filter.type', options: tenderTypes },
            { key: 'tender_status', labelKey: 'filter.status', options: enumOptions(['open', 'closed', 'cancelled', 'awarded']) },
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
          {list.items.map((tender) => (
            <TenderCard key={tender.id} tender={tender} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
