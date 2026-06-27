import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { DocumentSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { DocumentCard } from '@/components/cards/document-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Publications',
  description: 'Acts, rules, SOPs, research, publications and training resources.',
  path: '/publications',
});

type SP = Record<string, string | string[] | undefined>;

// The Knowledge Centre is the subset of documents explicitly tagged
// `show_in_knowledge_centre` (codex §4.5) — served by its dedicated endpoint, which
// already forces that flag. Public visibility alone does not include a document here.
export default async function KnowledgeCentrePage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, knowledgeCategories, documentTypes] = await Promise.all([
    getListSafe<DocumentSummary>(PUBLIC_ENDPOINTS.knowledgeCentre, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        knowledge_category: qstr(searchParams.knowledge_category),
        document_type: qstr(searchParams.document_type),
        ordering: '-publication_date',
      },
    }),
    getMasterOptions('knowledge-categories'),
    getMasterOptions('document-types'),
  ]);

  return (
    <ListingLayout
      titleKey="page.publications.title"
      subtitleKey="page.publications.subtitle"
      crumb="Publications"
      filters={
        <FilterBar
          selects={[
            { key: 'knowledge_category', labelKey: 'filter.knowledgeCategory', options: knowledgeCategories },
            { key: 'document_type', labelKey: 'filter.type', options: documentTypes },
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
