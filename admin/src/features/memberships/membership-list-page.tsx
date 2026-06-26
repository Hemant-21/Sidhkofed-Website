'use client';

/**
 * Institutional Membership list page. Composes the shared DataTable + filter framework + pagination
 * + bulk actions. Server pagination, server search, server filters, sorting, column selection, and
 * loading/empty/error states all come from the shared infrastructure — there is no client-side
 * filtering. Adds a permission-aware bulk-import action (codex §4.15).
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, BadgeCheck, Upload } from 'lucide-react';
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
import { MEMBERSHIPS_RESOURCE, MEMBERSHIP_PERMS } from './api';
import type { MembershipSummary } from './types';
import { membershipColumns } from './components/membership-columns';
import { MembershipFilters, MEMBERSHIP_FILTER_KEYS } from './components/membership-filters';
import { MembershipBulkUploadDialog } from './components/membership-bulk-upload-dialog';

export function MembershipListPage() {
  const filters = useFilters({ keys: MEMBERSHIP_FILTER_KEYS });
  const table = useDataTable();
  const confirm = useConfirmDialog();
  const [bulkOpen, setBulkOpen] = useState(false);

  const query = useMemo(
    () => ({
      ...filters.query,
      page: filters.page,
      ordering: table.ordering ?? filters.query.ordering,
    }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useCrudList<MembershipSummary>(MEMBERSHIPS_RESOURCE, query);
  const publish = usePublish<MembershipSummary>(MEMBERSHIPS_RESOURCE, { toastOnSuccess: false });
  const archive = useArchive<MembershipSummary>(MEMBERSHIPS_RESOURCE, { toastOnSuccess: false });
  const bulkPublish = useBulkAction({ verb: 'Published' });
  const bulkArchive = useBulkAction({ verb: 'Archived' });

  const columns = useMemo(
    () =>
      membershipColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.memberships}/${row.id}`}>View</Link>
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
        title="Institutional Membership"
        description="Institution-wise membership records — SIDHKOFED / District Union × Primary / Nominal."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Can permission={MEMBERSHIP_PERMS.create}>
              <Button
                variant="outline"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => setBulkOpen(true)}
              >
                Bulk import
              </Button>
            </Can>
            <Can permission={MEMBERSHIP_PERMS.create}>
              <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
                <Link href={`${ROUTES.memberships}/new`}>New membership</Link>
              </Button>
            </Can>
          </div>
        }
      />

      <MembershipFilters filters={filters} />

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
          <Can permission={MEMBERSHIP_PERMS.publish}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkPublish.isRunning}
              onClick={async () => {
                if (await confirm.confirmPublish(`${selected.length} membership(s)`)) {
                  await bulkPublish.run(selected, (id) => publish.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Publish
            </Button>
          </Can>
          <Can permission={MEMBERSHIP_PERMS.archive}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkArchive.isRunning}
              onClick={async () => {
                if (await confirm.confirmArchive(`${selected.length} membership(s)`)) {
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
        <DataTable<MembershipSummary>
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
              icon={BadgeCheck}
              title={filters.isActive ? 'No memberships match your filters' : 'No memberships yet'}
              description={
                filters.isActive
                  ? 'Try adjusting or clearing the filters.'
                  : 'Add the first institutional membership, or bulk-import a batch.'
              }
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Can permission={MEMBERSHIP_PERMS.create}>
                    <Button asChild size="sm">
                      <Link href={`${ROUTES.memberships}/new`}>New membership</Link>
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

      <MembershipBulkUploadDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
}
