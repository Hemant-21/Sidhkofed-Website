'use client';

/**
 * Audit Log list page. Composes the shared DataTable + filter framework + pagination. Server
 * pagination, server filters, server sorting, and loading/empty/error states all come from the
 * shared 15.0/15.1 infrastructure — there is no client-side filtering. The audit log is READ-ONLY
 * (no create/edit/bulk actions) and Super Admin only (API spec §8), so the whole page is gated with
 * a role check that renders an honest forbidden state for other roles instead of firing a 403.
 */

import { useMemo } from 'react';
import { ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/layout/card';
import { Pagination } from '@/components/ui/pagination';
import { DataTable, ColumnVisibility, useDataTable } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/hooks/crud';
import { usePermissions } from '@/hooks/use-permissions';
import { ROLE_KEYS } from '@/constants/permissions';
import { useAuditList } from './hooks';
import { auditColumns } from './components/audit-columns';
import { AuditFilters, AUDIT_FILTER_KEYS } from './components/audit-filters';

export function AuditListPage() {
  const { hasRole } = usePermissions();
  const isSuperAdmin = hasRole(ROLE_KEYS.superAdmin);

  const filters = useFilters({ keys: AUDIT_FILTER_KEYS });
  const table = useDataTable({ initialSort: { field: 'created_at', direction: 'desc' } });

  const query = useMemo(
    () => ({
      ...filters.query,
      page: filters.page,
      ordering: table.ordering ?? '-created_at',
    }),
    [filters.query, filters.page, table.ordering],
  );

  // Only Super Admin may read the audit log; gate the request so other roles never hit a 403.
  const list = useAuditList(query, isSuperAdmin);

  const columns = useMemo(() => auditColumns(), []);
  const rows = list.data?.items ?? [];
  const pagination = list.data?.pagination;

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit Log" description="A read-only record of administrative actions." />
        <ForbiddenState
          title="Restricted to Super Admin"
          description="The audit log of administrative actions is available to Super Administrators only."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="A read-only, append-only record of every administrative action — create, edit, publish, archive, restore, file replacement, master and settings changes, and sign-ins."
      />

      <Card className="space-y-4 p-4">
        <AuditFilters filters={filters} />
        <div className="flex justify-end">
          <ColumnVisibility
            columns={columns}
            hidden={table.hiddenColumns}
            onChange={table.setHiddenColumns}
          />
        </div>
      </Card>

      <Card className="p-0">
        <DataTable
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
          hiddenColumns={table.hiddenColumns}
          onRetry={() => void list.refetch()}
          emptyState={
            <EmptyState
              icon={ScrollText}
              title={filters.isActive ? 'No audit entries match your filters' : 'No audit entries yet'}
              description={
                filters.isActive
                  ? 'Try adjusting or clearing the filters.'
                  : 'Administrative actions will appear here as they happen.'
              }
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : undefined
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
