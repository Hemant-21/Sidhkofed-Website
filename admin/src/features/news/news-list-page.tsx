'use client';

/**
 * News list page. Composes the shared DataTable + filter framework + pagination against the `news`
 * resource. News is created by publishing a completed event as news (codex §4.1), so there is no
 * "New" button — the empty state explains the flow and links to Events.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Toolbar } from '@/components/layout/toolbar';
import { Card } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { DataTable, ColumnVisibility, useDataTable } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { useFilters, useCrudList } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { NEWS_RESOURCE } from './api';
import type { NewsSummary } from './types';
import { newsColumns } from './components/news-columns';
import { NewsFilters, NEWS_FILTER_KEYS } from './components/news-filters';

export function NewsListPage() {
  const filters = useFilters({ keys: NEWS_FILTER_KEYS });
  const table = useDataTable();

  const query = useMemo(
    () => ({ ...filters.query, page: filters.page, ordering: table.ordering ?? filters.query.ordering }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useCrudList<NewsSummary>(NEWS_RESOURCE, query);
  const columns = useMemo(
    () =>
      newsColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.news}/${row.id}`}>View</Link>
        </Button>
      )),
    [],
  );

  const pagination = list.data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        title="News"
        description="News records derived from completed events. Each stays linked to its source event."
      />

      <NewsFilters filters={filters} />

      <Toolbar end={<ColumnVisibility columns={columns} hidden={table.hiddenColumns} onChange={table.setHiddenColumns} />} />

      <Card className="p-0">
        <DataTable<NewsSummary>
          columns={columns}
          data={{
            rows: list.data?.items ?? [],
            totalItems: pagination?.total_items ?? 0,
            totalPages: pagination?.total_pages ?? 0,
            isLoading: list.isLoading,
            isError: list.isError,
            error: list.error,
          }}
          getRowId={(row) => row.id}
          sort={table.sort}
          onSortChange={table.onSortChange}
          hiddenColumns={table.hiddenColumns}
          onRetry={() => void list.refetch()}
          emptyState={
            <EmptyState
              icon={Newspaper}
              title={filters.isActive ? 'No news matches your filters' : 'No news yet'}
              description={
                filters.isActive
                  ? 'Try adjusting or clearing the filters.'
                  : 'Publish a completed event as news to create the first record.'
              }
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link href={ROUTES.events}>Go to Events</Link>
                  </Button>
                )
              }
            />
          }
        />
      </Card>

      {pagination ? (
        <Pagination
          page={pagination.page}
          pageSize={pagination.page_size}
          totalItems={pagination.total_items}
          totalPages={pagination.total_pages}
          onPageChange={filters.setPage}
        />
      ) : null}
    </div>
  );
}
