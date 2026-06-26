'use client';

/**
 * Procurement Updates list page. Server pagination, search, filters, sorting, bulk actions.
 * Frontend NEVER calculates rates or performs procurement logic — display only (codex §4.8).
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Plus, ShoppingCart } from 'lucide-react';
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
import { PROCUREMENT_RESOURCE, PROCUREMENT_PERMS } from './api';
import type { ProcurementSummary } from './types';
import { procurementColumns } from './components/procurement-columns';
import { ProcurementFilters, PROCUREMENT_FILTER_KEYS } from './components/procurement-filters';

export function ProcurementListPage() {
  const filters = useFilters({ keys: PROCUREMENT_FILTER_KEYS });
  const table = useDataTable();
  const confirm = useConfirmDialog();

  const query = useMemo(
    () => ({ ...filters.query, page: filters.page, ordering: table.ordering ?? filters.query.ordering }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useCrudList<ProcurementSummary>(PROCUREMENT_RESOURCE, query);
  const publish = usePublish<ProcurementSummary>(PROCUREMENT_RESOURCE, { toastOnSuccess: false });
  const archive = useArchive<ProcurementSummary>(PROCUREMENT_RESOURCE, { toastOnSuccess: false });
  const bulkPublish = useBulkAction({ verb: 'Published' });
  const bulkArchive = useBulkAction({ verb: 'Archived' });

  const columns = useMemo(
    () =>
      procurementColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.procurement}/${row.id}`}>View</Link>
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
        title="Procurement Updates"
        description="Procurement rates, announcements, schedules, centre updates, and trade opportunities. Display only."
        actions={
          <Can permission={PROCUREMENT_PERMS.create}>
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href={`${ROUTES.procurement}/new`}>New update</Link>
            </Button>
          </Can>
        }
      />

      <ProcurementFilters filters={filters} />

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
          <Can permission={PROCUREMENT_PERMS.publish}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkPublish.isRunning}
              onClick={async () => {
                if (await confirm.confirmPublish(`${selected.length} update(s)`)) {
                  await bulkPublish.run(selected, (id) => publish.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Publish
            </Button>
          </Can>
          <Can permission={PROCUREMENT_PERMS.archive}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkArchive.isRunning}
              onClick={async () => {
                if (await confirm.confirmArchive(`${selected.length} update(s)`)) {
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
        <DataTable<ProcurementSummary>
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
              icon={ShoppingCart}
              title={
                filters.isActive ? 'No procurement updates match your filters' : 'No procurement updates yet'
              }
              description={
                filters.isActive
                  ? 'Try adjusting or clearing the filters.'
                  : 'Create the first procurement rate, announcement, or schedule.'
              }
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Can permission={PROCUREMENT_PERMS.create}>
                    <Button asChild size="sm">
                      <Link href={`${ROUTES.procurement}/new`}>New update</Link>
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
