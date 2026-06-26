'use client';

/**
 * Events list page. Composes the shared DataTable + filter framework + pagination + bulk actions
 * against the `events` resource — server pagination, server search, server filters, sorting,
 * column selection, and loading/empty/error states all from shared infrastructure. Bulk publish/
 * archive reuse the lifecycle hooks and are permission-gated.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Plus, CalendarDays } from 'lucide-react';
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
import { EVENTS_RESOURCE } from './api';
import { CONTENT_PERMS } from './permissions';
import type { EventSummary } from './types';
import { eventColumns } from './components/event-columns';
import { EventFilters, EVENT_FILTER_KEYS } from './components/event-filters';

export function EventListPage() {
  const filters = useFilters({ keys: EVENT_FILTER_KEYS });
  const table = useDataTable();
  const confirm = useConfirmDialog();

  // Merge filter query with table sorting/pagination → backend list query.
  const query = useMemo(
    () => ({ ...filters.query, page: filters.page, ordering: table.ordering ?? filters.query.ordering }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useCrudList<EventSummary>(EVENTS_RESOURCE, query);
  const publish = usePublish<EventSummary>(EVENTS_RESOURCE, { toastOnSuccess: false });
  const archive = useArchive<EventSummary>(EVENTS_RESOURCE, { toastOnSuccess: false });
  const bulkPublish = useBulkAction({ verb: 'Published' });
  const bulkArchive = useBulkAction({ verb: 'Archived' });

  const columns = useMemo(
    () =>
      eventColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.events}/${row.id}`}>View</Link>
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
        title="Events & News"
        description="All institutional activities — training, workshops, meetings, MoUs, visits, and more."
        actions={
          <Can permission={CONTENT_PERMS.create}>
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href={`${ROUTES.events}/new`}>New event</Link>
            </Button>
          </Can>
        }
      />

      <EventFilters filters={filters} />

      <Toolbar
        end={<ColumnVisibility columns={columns} hidden={table.hiddenColumns} onChange={table.setHiddenColumns} />}
      />

      {selected.length > 0 ? (
        <BulkActions count={selected.length} onClear={table.clearSelection}>
          <Can permission={CONTENT_PERMS.publish}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkPublish.isRunning}
              onClick={async () => {
                if (await confirm.confirmPublish(`${selected.length} event(s)`)) {
                  await bulkPublish.run(selected, (id) => publish.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Publish
            </Button>
          </Can>
          <Can permission={CONTENT_PERMS.archive}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkArchive.isRunning}
              onClick={async () => {
                if (await confirm.confirmArchive(`${selected.length} event(s)`)) {
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
        <DataTable<EventSummary>
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
              icon={CalendarDays}
              title={filters.isActive ? 'No events match your filters' : 'No events yet'}
              description={filters.isActive ? 'Try adjusting or clearing the filters.' : 'Create the first event to get started.'}
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Can permission={CONTENT_PERMS.create}>
                    <Button asChild size="sm">
                      <Link href={`${ROUTES.events}/new`}>New event</Link>
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
