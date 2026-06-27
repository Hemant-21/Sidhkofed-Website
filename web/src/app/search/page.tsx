import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { SearchResult } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr } from '@/lib/listing';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { LocalizedHeading } from '@/components/listing/localized-heading';
import { SearchForm } from '@/components/search/search-form';
import { SearchResults, SearchMessage } from '@/components/search/search-results';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';

export const revalidate = 0; // search is always dynamic

export const metadata: Metadata = buildMetadata({
  title: 'Search',
  description: 'Search events, news, documents, programmes, communications, tenders and more.',
  path: '/search',
});

type SP = Record<string, string | string[] | undefined>;

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const q = qstr(searchParams.q);
  const contentType = qstr(searchParams.content_type);
  const page = toPage(searchParams.page);
  const hasQuery = Boolean(q && q.length >= 2);

  const list = hasQuery
    ? await getListSafe<SearchResult>(PUBLIC_ENDPOINTS.search, {
        query: { q, content_type: contentType, page, page_size: PAGE_SIZE },
        revalidate: false,
      })
    : { items: [], pagination: { page: 1, page_size: 0, total_items: 0, total_pages: 0 } };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Search' }]} />
      <Container className="py-8">
        <header className="mb-6">
          <LocalizedHeading titleKey="search.title" as="h1" />
        </header>

        <div className="mb-6">
          <SearchForm />
        </div>

        {!hasQuery && <SearchMessage kind="prompt" />}
        {hasQuery && list.items.length === 0 && <SearchMessage kind="none" />}
        {hasQuery && list.items.length > 0 && (
          <>
            <ResultsSummary total={list.pagination.total_items} />
            <SearchResults results={list.items} />
            <PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />
          </>
        )}
      </Container>
    </>
  );
}
