'use client';

/**
 * Programmes list page. Composes the shared DataTable + filter framework + pagination + bulk actions
 * against the `programmes` resource — server pagination, server search, server filters, sorting,
 * column selection, and loading/empty/error states all from shared infrastructure. Bulk publish/
 * archive reuse the lifecycle hooks and are gated on the module-specific `programmes.*` permissions.
 * No client-side filtering.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Plus, BookOpen } from 'lucide-react';
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
import { PROGRAMMES_RESOURCE, PROGRAMME_PERMS } from './api';
import type { ProgrammeSummary } from './types';
import { programmeColumns } from './components/programme-columns';
import { ProgrammeFilters, PROGRAMME_FILTER_KEYS } from './components/programme-filters';

export function ProgrammeListPage() {
  const filters = useFilters({ keys: PROGRAMME_FILTER_KEYS });
  const table = useDataTable();
  const confirm = useConfirmDialog();

  const query = useMemo(
    () => ({ ...filters.query, page: filters.page, ordering: table.ordering ?? filters.query.ordering }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useCrudList<ProgrammeSummary>(PROGRAMMES_RESOURCE, query);
  const publish = usePublish<ProgrammeSummary>(PROGRAMMES_RESOURCE, { toastOnSuccess: false });
  const archive = useArchive<ProgrammeSummary>(PROGRAMMES_RESOURCE, { toastOnSuccess: false });
  const bulkPublish = useBulkAction({ verb: 'Published' });
  const bulkArchive = useBulkAction({ verb: 'Archived' });

  const columns = useMemo(
    () =>
      programmeColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.programmes}/${row.id}`}>View</Link>
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
        title="Programmes & Schemes"
        description="One reusable ProgrammeScheme record linked across events, toolkits, documents, and the dashboard."
        actions={
          <Can permission={PROGRAMME_PERMS.create}>
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href={`${ROUTES.programmes}/new`}>New programme</Link>
            </Button>
          </Can>
        }
      />

      <ProgrammeFilters filters={filters} />

      <Toolbar end={<ColumnVisibility columns={columns} hidden={table.hiddenColumns} onChange={table.setHiddenColumns} />} />

      {selected.length > 0 ? (
        <BulkActions count={selected.length} onClear={table.clearSelection}>
          <Can permission={PROGRAMME_PERMS.publish}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkPublish.isRunning}
              onClick={async () => {
                if (await confirm.confirmPublish(`${selected.length} programme(s)`)) {
                  await bulkPublish.run(selected, (id) => publish.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Publish
            </Button>
          </Can>
          <Can permission={PROGRAMME_PERMS.archive}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkArchive.isRunning}
              onClick={async () => {
                if (await confirm.confirmArchive(`${selected.length} programme(s)`)) {
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
        <DataTable<ProgrammeSummary>
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
              icon={BookOpen}
              title={filters.isActive ? 'No programmes match your filters' : 'No programmes yet'}
              description={filters.isActive ? 'Try adjusting or clearing the filters.' : 'Create the first programme or scheme to get started.'}
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Can permission={PROGRAMME_PERMS.create}>
                    <Button asChild size="sm">
                      <Link href={`${ROUTES.programmes}/new`}>New programme</Link>
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
