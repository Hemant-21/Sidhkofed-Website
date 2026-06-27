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
  title: 'SIDHKOFED Membership',
  description: 'Primary and nominal members of SIDHKOFED — the apex cooperative federation of Jharkhand.',
  path: '/membership/sidhkofed',
});

type SP = Record<string, string | string[] | undefined>;

export default async function SidhkofedMembersPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, districts] = await Promise.all([
    getListSafe<MembershipSummary>(PUBLIC_ENDPOINTS.memberships, {
      query: {
        page,
        page_size: 30,
        membership_level: 'sidhkofed',
        membership_type: qstr(searchParams.membership_type),
        district: qstr(searchParams.district),
        ordering: 'display_order',
      },
    }),
    getMasterOptions('districts'),
  ]);

  return (
    <ListingLayout
      titleKey="page.membership.sidhkofed.title"
      subtitleKey="page.membership.sidhkofed.subtitle"
      crumb="SIDHKOFED Membership"
      parentCrumbs={[{ label: 'Membership', href: '/membership' }]}
      filters={
        <FilterBar
          searchable={false}
          selects={[
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
