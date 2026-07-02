'use client';

/**
 * Dedicated search results page (Phase 15.2) at `/search`. URL-driven so a search
 * is shareable/bookmarkable and survives refresh. Server-side search with grouped
 * results, the backend's allow-listed filters (content type + year), pagination,
 * and full empty / loading / error / no-result states. No client-side filtering.
 */

import { useEffect, useState } from 'react';
import { Search as SearchIcon, SearchX } from 'lucide-react';
import { PageContainer, ContentWrapper, PageHeader, Card, CardContent } from '@/components/layout';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonText } from '@/components/feedback/skeleton';
import { useQueryParams } from '@/hooks/use-query-params';
import { useDebounce } from '@/hooks/use-debounce';
import { ROUTES } from '@/constants/routes';
import { PAGE_SIZE_DEFAULT } from '@/constants/app';
import { isContentType, MIN_QUERY_LENGTH, type ContentType } from '@/types/search';
import { useSearchResults, isSearchable } from './hooks';
import { SearchResults } from './components/search-results';
import { SearchFilters, type SearchFilterValue } from './components/search-filters';

function parseTypes(csv: string | null): ContentType[] {
  if (!csv) return [];
  return csv.split(',').map((s) => s.trim()).filter(isContentType);
}

export function SearchPage() {
  const { get, set } = useQueryParams();

  const urlQuery = get('q') ?? '';
  const page = Math.max(1, Number(get('page')) || 1);
  const filters: SearchFilterValue = {
    contentTypes: parseTypes(get('content_type')),
    year: get('year') ?? '',
  };

  // The text box stays responsive locally; the URL (and thus the query) updates on debounce.
  const [text, setText] = useState(urlQuery);
  const debouncedText = useDebounce(text);

  // Keep the box in sync when the URL `q` changes externally (e.g. arriving from the modal).
  useEffect(() => setText(urlQuery), [urlQuery]);

  useEffect(() => {
    if (debouncedText !== urlQuery) set({ q: debouncedText || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedText]);

  const trimmed = debouncedText.trim();
  const { data, isLoading, isFetching, error, refetch } = useSearchResults({
    q: trimmed,
    content_type: filters.contentTypes.length ? filters.contentTypes.join(',') : undefined,
    year: filters.year || undefined,
    page,
    page_size: PAGE_SIZE_DEFAULT,
  });

  const ready = isSearchable(trimmed);
  const results = data?.items ?? [];
  const pagination = data?.pagination;

  const onFilterChange = (next: SearchFilterValue) => {
    set({
      content_type: next.contentTypes.length ? next.contentTypes.join(',') : undefined,
      year: next.year || undefined,
    });
  };

  return (
    <PageContainer>
      <ContentWrapper>
        <PageHeader
          title="Search"
          description="Search across published and draft content — events, news, documents, communications, tenders, procurement updates, programmes, and pages."
          breadcrumbs={[{ label: 'Dashboard', href: ROUTES.dashboard }, { label: 'Search' }]}
        />

        <div className="space-y-4">
          <SearchInput
            value={text}
            onValueChange={setText}
            placeholder="Search all content…"
            aria-label="Search all content"
          />
          <SearchFilters value={filters} onChange={onFilterChange} />
        </div>

        <Card>
          <CardContent aria-live="polite" aria-busy={isFetching}>
            {!ready ? (
              <EmptyState
                icon={SearchIcon}
                title="Search the CMS"
                description={`Enter at least ${MIN_QUERY_LENGTH} characters to begin.`}
              />
            ) : isLoading ? (
              <SkeletonText lines={8} />
            ) : error ? (
              <ErrorState error={error} onRetry={() => refetch()} />
            ) : results.length === 0 ? (
              <EmptyState icon={SearchX} title="No results found" description={`Nothing matched “${trimmed}”. Try different terms or clear filters.`} />
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  {pagination?.total_items ?? results.length} result
                  {(pagination?.total_items ?? results.length) === 1 ? '' : 's'} for “{trimmed}”
                </p>
                <SearchResults results={results} />
                {pagination && pagination.total_pages > 1 ? (
                  <Pagination
                    page={pagination.page}
                    pageSize={pagination.page_size}
                    totalItems={pagination.total_items}
                    totalPages={pagination.total_pages}
                    onPageChange={(next) => set({ page: next }, { resetPage: false })}
                  />
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </ContentWrapper>
    </PageContainer>
  );
}
