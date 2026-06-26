'use client';

/**
 * Dashboard Reports list page. The FIXED report catalog (codex §13) with each report's publication
 * state + visibility. Composes the shared DataTable + filter framework + pagination + bulk lifecycle.
 * Server pagination/search/filters/sorting; no client-side filtering. Report DEFINITION create is
 * Super Admin only; lifecycle uses the dedicated `dashboard.*` keys. The backend enforces RBAC.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Plus, BarChart3 } from 'lucide-react';
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
import { REPORTS_RESOURCE, DASHBOARD_PERMS } from './api';
import { REPORT_DEFINITION_ROLES } from './permissions';
import type { DashboardReportSummary } from './types';
import { reportColumns } from './components/report-columns';
import { ReportFilters, REPORT_FILTER_KEYS } from './components/report-filters';

export function ReportListPage() {
  const filters = useFilters({ keys: REPORT_FILTER_KEYS });
  const table = useDataTable();
  const confirm = useConfirmDialog();

  const query = useMemo(
    () => ({
      ...filters.query,
      page: filters.page,
      ordering: table.ordering ?? filters.query.ordering,
    }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useCrudList<DashboardReportSummary>(REPORTS_RESOURCE, query);
  const publish = usePublish<DashboardReportSummary>(REPORTS_RESOURCE, { toastOnSuccess: false });
  const archive = useArchive<DashboardReportSummary>(REPORTS_RESOURCE, { toastOnSuccess: false });
  const bulkPublish = useBulkAction({ verb: 'Published' });
  const bulkArchive = useBulkAction({ verb: 'Archived' });

  const columns = useMemo(
    () =>
      reportColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.dashboardReports}/${row.id}`}>Manage</Link>
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
        title="Dashboard Reports"
        description="Fixed public dashboard reports — manage visibility, lifecycle, metrics, and imported data."
        breadcrumbs={[{ label: 'Dashboard', href: ROUTES.dashboard }, { label: 'Reports' }]}
        actions={
          <Can role={REPORT_DEFINITION_ROLES}>
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href={`${ROUTES.dashboardReports}/new`}>New report</Link>
            </Button>
          </Can>
        }
      />

      <ReportFilters filters={filters} />

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
          <Can permission={DASHBOARD_PERMS.publish}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkPublish.isRunning}
              onClick={async () => {
                if (await confirm.confirmPublish(`${selected.length} report(s)`)) {
                  await bulkPublish.run(selected, (id) => publish.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Publish
            </Button>
          </Can>
          <Can permission={DASHBOARD_PERMS.archive}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkArchive.isRunning}
              onClick={async () => {
                if (await confirm.confirmArchive(`${selected.length} report(s)`)) {
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
        <DataTable<DashboardReportSummary>
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
              icon={BarChart3}
              title={filters.isActive ? 'No reports match your filters' : 'No reports configured'}
              description={
                filters.isActive
                  ? 'Try adjusting or clearing the filters.'
                  : 'The fixed dashboard reports are seeded by the backend.'
              }
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : null
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
