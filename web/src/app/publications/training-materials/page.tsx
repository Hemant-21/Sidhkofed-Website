import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { DocumentSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, yearOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { DocumentCard } from '@/components/cards/document-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Training Materials',
  description: 'Training manuals, handbooks and learning resources from SIDHKOFED.',
  path: '/publications/training-materials',
});

type SP = Record<string, string | string[] | undefined>;

export default async function TrainingMaterialsPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const list = await getListSafe<DocumentSummary>(PUBLIC_ENDPOINTS.knowledgeCentre, {
    query: {
      page,
      page_size: PAGE_SIZE,
      search: qstr(searchParams.search),
      knowledge_category_slug: 'training',
      year: qstr(searchParams.year),
      ordering: '-publication_date',
    },
  });

  return (
    <ListingLayout
      titleKey="page.publications.training.title"
      subtitleKey="page.publications.training.subtitle"
      crumb="Training Materials"
      parentCrumbs={[{ label: 'Publications', href: '/publications' }]}
      filters={
        <FilterBar
          selects={[{ key: 'year', labelKey: 'filter.year', options: yearOptions() }]}
        />
      }
      summary={<ResultsSummary total={list.pagination.total_items} />}
      pagination={<PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />}
    >
      {list.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.items.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
