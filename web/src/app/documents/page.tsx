import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { DocumentSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions, yearOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { DocumentCard } from '@/components/cards/document-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Documents',
  description: 'Public documents, reports, policies, guidelines and forms.',
  path: '/documents',
});

type SP = Record<string, string | string[] | undefined>;

export default async function DocumentsPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, documentTypes, commodities] = await Promise.all([
    getListSafe<DocumentSummary>(PUBLIC_ENDPOINTS.documents, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        document_type: qstr(searchParams.document_type),
        commodity: qstr(searchParams.commodity),
        year: qstr(searchParams.year),
        ordering: '-publication_date',
      },
    }),
    getMasterOptions('document-types'),
    getMasterOptions('commodities'),
  ]);

  return (
    <ListingLayout
      titleKey="page.documents.title"
      subtitleKey="page.documents.subtitle"
      crumb="Documents"
      filters={
        <FilterBar
          selects={[
            { key: 'document_type', labelKey: 'filter.type', options: documentTypes },
            { key: 'commodity', labelKey: 'filter.commodity', options: commodities },
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.items.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
