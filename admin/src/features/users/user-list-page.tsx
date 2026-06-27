'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
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
import { ROUTES } from '@/constants/routes';
import { useUserList } from './hooks';
import { userColumns } from './components/user-columns';
import { UserFilters } from './components/user-filters';
import { USER_FILTER_KEYS } from './types';

export function UserListPage() {
  const { hasRole } = usePermissions();
  const isSuperAdmin = hasRole(ROLE_KEYS.superAdmin);

  const filters = useFilters({ keys: [...USER_FILTER_KEYS] });
  const table = useDataTable({ initialSort: { field: 'full_name', direction: 'asc' } });

  const query = useMemo(
    () => ({
      ...filters.query,
      page: filters.page,
      ordering: table.ordering ?? 'full_name',
    }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useUserList(query, isSuperAdmin);
  const columns = useMemo(() => userColumns(), []);
  const rows = list.data?.items ?? [];
  const pagination = list.data?.pagination;

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users" description="Manage CMS user accounts." />
        <ForbiddenState
          title="Restricted to Super Admin"
          description="User management is available to Super Administrators only."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage CMS user accounts, roles, and access."
        actions={
          <Button variant="primary" size="sm" asChild>
            <Link href={`${ROUTES.users}/new`}>Add user</Link>
          </Button>
        }
      />

      <Card className="space-y-4 p-4">
        <UserFilters filters={filters} />
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
              icon={Users}
              title={filters.isActive ? 'No users match your filters' : 'No users yet'}
              description={
                filters.isActive
                  ? 'Try adjusting or clearing the filters.'
                  : 'Create the first CMS user to get started.'
              }
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" asChild>
                    <Link href={`${ROUTES.users}/new`}>Add user</Link>
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
