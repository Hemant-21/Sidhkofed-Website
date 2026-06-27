import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { ProcurementSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { ProcurementCard } from '@/components/cards/procurement-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Upcoming Procurement',
  description: 'Scheduled and upcoming procurement drives for MFP and agricultural commodities in Jharkhand.',
  path: '/procurement/upcoming',
});

type SP = Record<string, string | string[] | undefined>;

const today = new Date().toISOString().split('T')[0];

export default async function UpcomingProcurementPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, commodities, districts] = await Promise.all([
    getListSafe<ProcurementSummary>(PUBLIC_ENDPOINTS.procurement, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        commodity: qstr(searchParams.commodity),
        district: qstr(searchParams.district),
        effective_date_from: today,
        ordering: 'effective_date',
      },
    }),
    getMasterOptions('commodities'),
    getMasterOptions('districts'),
  ]);

  return (
    <ListingLayout
      titleKey="page.procurement.upcoming.title"
      subtitleKey="page.procurement.upcoming.subtitle"
      crumb="Upcoming Procurement"
      parentCrumbs={[{ label: 'Procurement', href: '/procurement' }]}
      filters={
        <FilterBar
          selects={[
            { key: 'commodity', labelKey: 'filter.commodity', options: commodities },
            { key: 'district', labelKey: 'filter.district', options: districts },
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
            <ProcurementCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
