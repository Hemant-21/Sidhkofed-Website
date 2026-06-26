'use client';

/**
 * Digital Services list page. Composes the shared DataTable + filter framework + pagination + bulk
 * actions. Server pagination, server search, server filters, sorting, column selection, and
 * loading/empty/error states from shared infrastructure. No client-side filtering.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Plus, AppWindow } from 'lucide-react';
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
import { DIGITAL_SERVICES_RESOURCE, DIGITAL_SERVICE_PERMS } from './api';
import type { DigitalServiceSummary } from './types';
import { digitalServiceColumns } from './components/digital-service-columns';
import { DigitalServiceFilters, DIGITAL_SERVICE_FILTER_KEYS } from './components/digital-service-filters';

export function DigitalServiceListPage() {
  const filters = useFilters({ keys: DIGITAL_SERVICE_FILTER_KEYS });
  const table = useDataTable();
  const confirm = useConfirmDialog();

  const query = useMemo(
    () => ({ ...filters.query, page: filters.page, ordering: table.ordering ?? filters.query.ordering }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useCrudList<DigitalServiceSummary>(DIGITAL_SERVICES_RESOURCE, query);
  const publish = usePublish<DigitalServiceSummary>(DIGITAL_SERVICES_RESOURCE, { toastOnSuccess: false });
  const archive = useArchive<DigitalServiceSummary>(DIGITAL_SERVICES_RESOURCE, { toastOnSuccess: false });
  const bulkPublish = useBulkAction({ verb: 'Published' });
  const bulkArchive = useBulkAction({ verb: 'Archived' });

  const columns = useMemo(
    () =>
      digitalServiceColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.digitalServices}/${row.id}`}>View</Link>
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
        title="Digital Services"
        description="Controlled links to approved external systems — ERP, MIS, membership, beneficiary portals."
        actions={
          <Can permission={DIGITAL_SERVICE_PERMS.create}>
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href={`${ROUTES.digitalServices}/new`}>New digital service</Link>
            </Button>
          </Can>
        }
      />

      <DigitalServiceFilters filters={filters} />

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
          <Can permission={DIGITAL_SERVICE_PERMS.publish}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkPublish.isRunning}
              onClick={async () => {
                if (await confirm.confirmPublish(`${selected.length} service(s)`)) {
                  await bulkPublish.run(selected, (id) => publish.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Publish
            </Button>
          </Can>
          <Can permission={DIGITAL_SERVICE_PERMS.archive}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkArchive.isRunning}
              onClick={async () => {
                if (await confirm.confirmArchive(`${selected.length} service(s)`)) {
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
        <DataTable<DigitalServiceSummary>
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
              icon={AppWindow}
              title={filters.isActive ? 'No services match your filters' : 'No digital services yet'}
              description={
                filters.isActive
                  ? 'Try adjusting or clearing the filters.'
                  : 'Add the first approved external service link to get started.'
              }
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Can permission={DIGITAL_SERVICE_PERMS.create}>
                    <Button asChild size="sm">
                      <Link href={`${ROUTES.digitalServices}/new`}>New digital service</Link>
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
