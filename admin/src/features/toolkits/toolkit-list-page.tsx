'use client';

/**
 * Toolkits list page. Composes the shared DataTable + filter framework + pagination + bulk actions
 * against the `toolkits` resource — server pagination, server search, server filters, sorting,
 * column selection, and loading/empty/error states all from shared infrastructure. Bulk publish/
 * archive reuse the lifecycle hooks and are gated on the module-specific `toolkits.*` permissions.
 * No client-side filtering.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Plus, Wrench } from 'lucide-react';
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
import { TOOLKITS_RESOURCE, TOOLKIT_PERMS } from './api';
import type { ToolkitSummary } from './types';
import { toolkitColumns } from './components/toolkit-columns';
import { ToolkitFilters, TOOLKIT_FILTER_KEYS } from './components/toolkit-filters';

export function ToolkitListPage() {
  const filters = useFilters({ keys: TOOLKIT_FILTER_KEYS });
  const table = useDataTable();
  const confirm = useConfirmDialog();

  const query = useMemo(
    () => ({ ...filters.query, page: filters.page, ordering: table.ordering ?? filters.query.ordering }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useCrudList<ToolkitSummary>(TOOLKITS_RESOURCE, query);
  const publish = usePublish<ToolkitSummary>(TOOLKITS_RESOURCE, { toastOnSuccess: false });
  const archive = useArchive<ToolkitSummary>(TOOLKITS_RESOURCE, { toastOnSuccess: false });
  const bulkPublish = useBulkAction({ verb: 'Published' });
  const bulkArchive = useBulkAction({ verb: 'Archived' });

  const columns = useMemo(
    () =>
      toolkitColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.toolkits}/${row.id}`}>View</Link>
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
        title="Toolkits"
        description="Reusable toolkit definitions — a programme/scheme + commodity + ordered items. Per-event distribution figures roll up from the Events module."
        actions={
          <Can permission={TOOLKIT_PERMS.create}>
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href={`${ROUTES.toolkits}/new`}>New toolkit</Link>
            </Button>
          </Can>
        }
      />

      <ToolkitFilters filters={filters} />

      <Toolbar end={<ColumnVisibility columns={columns} hidden={table.hiddenColumns} onChange={table.setHiddenColumns} />} />

      {selected.length > 0 ? (
        <BulkActions count={selected.length} onClear={table.clearSelection}>
          <Can permission={TOOLKIT_PERMS.publish}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkPublish.isRunning}
              onClick={async () => {
                if (await confirm.confirmPublish(`${selected.length} toolkit(s)`)) {
                  await bulkPublish.run(selected, (id) => publish.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Publish
            </Button>
          </Can>
          <Can permission={TOOLKIT_PERMS.archive}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkArchive.isRunning}
              onClick={async () => {
                if (await confirm.confirmArchive(`${selected.length} toolkit(s)`)) {
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
        <DataTable<ToolkitSummary>
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
              icon={Wrench}
              title={filters.isActive ? 'No toolkits match your filters' : 'No toolkits yet'}
              description={filters.isActive ? 'Try adjusting or clearing the filters.' : 'Create the first toolkit to get started.'}
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Can permission={TOOLKIT_PERMS.create}>
                    <Button asChild size="sm">
                      <Link href={`${ROUTES.toolkits}/new`}>New toolkit</Link>
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
