import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { InstitutionSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { InstitutionCard } from '@/components/cards/institution-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Partners & institutions',
  description: 'Government departments, agencies, universities and cooperative partners.',
  path: '/institutions',
});

type SP = Record<string, string | string[] | undefined>;

export default async function InstitutionsPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, institutionTypes, districts] = await Promise.all([
    getListSafe<InstitutionSummary>(PUBLIC_ENDPOINTS.institutions, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        institution_type: qstr(searchParams.institution_type),
        district: qstr(searchParams.district),
        ordering: 'display_order',
      },
    }),
    getMasterOptions('institution-types'),
    getMasterOptions('districts'),
  ]);

  return (
    <ListingLayout
      titleKey="page.institutions.title"
      subtitleKey="page.institutions.subtitle"
      crumb="Institutions"
      filters={
        <FilterBar
          selects={[
            { key: 'institution_type', labelKey: 'filter.institutionType', options: institutionTypes },
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map((institution) => (
            <InstitutionCard key={institution.id} institution={institution} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
