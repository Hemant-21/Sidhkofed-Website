import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { ProcurementSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions, yearOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { ProcurementCard } from '@/components/cards/procurement-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Procurement announcements',
  description: 'Procurement rates, announcements, schedules and trade opportunities.',
  path: '/procurement/announcements',
});

type SP = Record<string, string | string[] | undefined>;

export default async function ProcurementPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, updateTypes, commodities, districts] = await Promise.all([
    getListSafe<ProcurementSummary>(PUBLIC_ENDPOINTS.procurement, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        procurement_update_type: qstr(searchParams.procurement_update_type),
        commodity: qstr(searchParams.commodity),
        district: qstr(searchParams.district),
        year: qstr(searchParams.year),
        ordering: '-effective_date',
      },
    }),
    getMasterOptions('procurement-update-types'),
    getMasterOptions('commodities'),
    getMasterOptions('districts'),
  ]);

  return (
    <ListingLayout
      titleKey="page.procurement.title"
      subtitleKey="page.procurement.subtitle"
      crumb="Procurement updates"
      filters={
        <FilterBar
          selects={[
            { key: 'procurement_update_type', labelKey: 'filter.type', options: updateTypes },
            { key: 'commodity', labelKey: 'filter.commodity', options: commodities },
            { key: 'district', labelKey: 'filter.district', options: districts },
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
            <ProcurementCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
