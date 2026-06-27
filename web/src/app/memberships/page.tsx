import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { MembershipSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { toPage, qstr, getMasterOptions, enumOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { MembershipTable } from '@/components/details/membership-table';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Institutional membership',
  description: 'Directory of SIDHKOFED and District Union member institutions.',
  path: '/memberships',
});

type SP = Record<string, string | string[] | undefined>;

export default async function MembershipsPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, districts] = await Promise.all([
    getListSafe<MembershipSummary>(PUBLIC_ENDPOINTS.memberships, {
      query: {
        page,
        page_size: 30,
        membership_level: qstr(searchParams.membership_level),
        membership_type: qstr(searchParams.membership_type),
        district: qstr(searchParams.district),
        ordering: 'display_order',
      },
    }),
    getMasterOptions('districts'),
  ]);

  return (
    <ListingLayout
      titleKey="page.memberships.title"
      subtitleKey="page.memberships.subtitle"
      crumb="Membership"
      filters={
        <FilterBar
          searchable={false}
          selects={[
            { key: 'membership_level', labelKey: 'filter.level', options: enumOptions(['sidhkofed', 'district_union']) },
            { key: 'membership_type', labelKey: 'filter.membershipType', options: enumOptions(['primary', 'nominal']) },
            { key: 'district', labelKey: 'filter.district', options: districts },
          ]}
        />
      }
      summary={<ResultsSummary total={list.pagination.total_items} />}
      pagination={<PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />}
    >
      <MembershipTable memberships={list.items} />
    </ListingLayout>
  );
}
