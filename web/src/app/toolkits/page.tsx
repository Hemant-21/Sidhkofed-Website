import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { ToolkitSummary, ProgrammeSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions } from '@/lib/listing';
import type { FilterOption } from '@/components/listing/filter-bar';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { ToolkitCard } from '@/components/cards/toolkit-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Toolkits',
  description: 'Toolkit definitions and distribution information by programme and commodity.',
  path: '/toolkits',
});

type SP = Record<string, string | string[] | undefined>;

async function getProgrammeOptions(): Promise<FilterOption[]> {
  const { items } = await getListSafe<ProgrammeSummary>(PUBLIC_ENDPOINTS.programmes, {
    query: { page_size: 100, ordering: 'display_order' },
    revalidate: 3600,
  });
  return items.map((p) => ({ value: p.slug, name_en: p.title_en, name_hi: p.title_hi }));
}

export default async function ToolkitsPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, commodities, programmes] = await Promise.all([
    getListSafe<ToolkitSummary>(PUBLIC_ENDPOINTS.toolkits, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        commodity: qstr(searchParams.commodity),
        programme: qstr(searchParams.programme),
        ordering: 'display_order',
      },
    }),
    getMasterOptions('commodities'),
    getProgrammeOptions(),
  ]);

  return (
    <ListingLayout
      titleKey="page.toolkits.title"
      subtitleKey="page.toolkits.subtitle"
      crumb="Toolkits"
      filters={
        <FilterBar
          selects={[
            { key: 'commodity', labelKey: 'filter.commodity', options: commodities },
            { key: 'programme', labelKey: 'filter.programme', options: programmes },
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
          {list.items.map((toolkit) => (
            <ToolkitCard key={toolkit.id} toolkit={toolkit} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
