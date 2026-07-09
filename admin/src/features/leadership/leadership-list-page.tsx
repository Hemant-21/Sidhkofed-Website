'use client';

/**
 * Leadership list page. Composes the shared DataTable + filter framework + pagination + bulk
 * actions. Server pagination, server search, server filters, sorting, column selection, and
 * loading/empty/error states from shared infrastructure. No client-side filtering.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Plus, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Toolbar } from '@/components/layout/toolbar';
import { Card } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { DataTable, ColumnVisibility, BulkActions, useDataTable } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { Can } from '@/components/auth';
import { useFilters, useCrudList, useArchive, usePublish, useBulkAction } from '@/hooks/crud';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { ROUTES } from '@/constants/routes';
import { LEADERSHIP_RESOURCE, LEADERSHIP_PERMS } from './api';
import type { LeadershipSummary } from './types';
import { leadershipColumns } from './components/leadership-columns';
import { LeadershipFilters, LEADERSHIP_FILTER_KEYS } from './components/leadership-filters';

export function LeadershipListPage() {
  const filters = useFilters({ keys: LEADERSHIP_FILTER_KEYS });
  const table = useDataTable();
  const confirm = useConfirmDialog();

  const query = useMemo(
    () => ({ ...filters.query, page: filters.page, ordering: table.ordering ?? filters.query.ordering }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useCrudList<LeadershipSummary>(LEADERSHIP_RESOURCE, query);
  const publish = usePublish<LeadershipSummary>(LEADERSHIP_RESOURCE, { toastOnSuccess: false });
  const archive = useArchive<LeadershipSummary>(LEADERSHIP_RESOURCE, { toastOnSuccess: false });
  const bulkPublish = useBulkAction({ verb: 'Published' });
  const bulkArchive = useBulkAction({ verb: 'Archived' });

  const columns = useMemo(
    () =>
      leadershipColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.leadership}/${row.id}`}>View</Link>
        </Button>
      )),
    [],
  );

  const rows = list.data?.items ?? [];
  const pagination = list.data?.pagination;
  const selected = table.selectedRowIds;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leadership"
        description="Leadership profiles shown on the public site — government role and SIDHKOFED role."
        actions={
          <Can permission={LEADERSHIP_PERMS.create}>
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href={`${ROUTES.leadership}/new`}>New leadership entry</Link>
            </Button>
          </Can>
        }
      />

      <LeadershipFilters filters={filters} />

      <Toolbar
        end={
          <ColumnVisibility
            columns={columns}
            hidden={table.hiddenColumns}
            onChange={table.setHiddenColumns}
          />
        }
      />

      {selected.length > 0 ? (
        <BulkActions count={selected.length} onClear={table.clearSelection}>
          <Can permission={LEADERSHIP_PERMS.publish}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkPublish.isRunning}
              onClick={async () => {
                if (await confirm.confirmPublish(`${selected.length} leadership entr${selected.length === 1 ? 'y' : 'ies'}`)) {
                  await bulkPublish.run(selected, (id) => publish.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Publish
            </Button>
          </Can>
          <Can permission={LEADERSHIP_PERMS.archive}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkArchive.isRunning}
              onClick={async () => {
                if (await confirm.confirmArchive(`${selected.length} leadership entr${selected.length === 1 ? 'y' : 'ies'}`)) {
                  await bulkArchive.run(selected, (id) => archive.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Archive
            </Button>
          </Can>
        </BulkActions>
      ) : null}

      <Card className="p-0">
        <DataTable<LeadershipSummary>
          columns={columns}
          data={{
            rows,
            totalItems: pagination?.total_items ?? 0,
            totalPages: pagination?.total_pages ?? 0,
            isLoading: list.isLoading,
            isError: list.isError,
            error: list.error,
          }}
          getRowId={(row) => row.id}
          sort={table.sort}
          onSortChange={table.onSortChange}
          selectable
          selectedRowIds={selected}
          onSelectionChange={table.setSelectedRowIds}
          hiddenColumns={table.hiddenColumns}
          onRetry={() => void list.refetch()}
          emptyState={
            <EmptyState
              icon={UserRound}
              title={filters.isActive ? 'No leadership entries match your filters' : 'No leadership entries yet'}
              description={
                filters.isActive
                  ? 'Try adjusting or clearing the filters.'
                  : 'Add the first leadership profile to get started.'
              }
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Can permission={LEADERSHIP_PERMS.create}>
                    <Button asChild size="sm">
                      <Link href={`${ROUTES.leadership}/new`}>New leadership entry</Link>
                    </Button>
                  </Can>
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
