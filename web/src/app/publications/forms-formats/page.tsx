import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { DocumentSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { DocumentCard } from '@/components/cards/document-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Forms & Formats',
  description: 'Application forms and official formats from SIDHKOFED.',
  path: '/publications/forms-formats',
});

type SP = Record<string, string | string[] | undefined>;

export default async function FormsFormatsPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const list = await getListSafe<DocumentSummary>(PUBLIC_ENDPOINTS.knowledgeCentre, {
    query: {
      page,
      page_size: PAGE_SIZE,
      search: qstr(searchParams.search),
      knowledge_category: 'forms-and-formats',
      ordering: 'display_order',
    },
  });

  return (
    <ListingLayout
      titleKey="page.publications.forms.title"
      subtitleKey="page.publications.forms.subtitle"
      crumb="Forms & Formats"
      parentCrumbs={[{ label: 'Publications', href: '/publications' }]}
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
