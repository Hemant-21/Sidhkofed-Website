'use client';

/**
 * Users list page (Administration; Super Admin only). Server-driven list with role/status filters,
 * inline activate/deactivate and password-reset actions, and a create affordance. All mutations call
 * the backend Users API; RBAC is enforced server-side and mirrored here via <Can>/role gating.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Users as UsersIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { DataTable, useDataTable } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { Can } from '@/components/auth';
import { useCrudList, useFilters } from '@/hooks/crud';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/server-errors';
import { invalidateResource } from '@/lib/query';
import { ROUTES } from '@/constants/routes';
import { ROLE_KEYS } from '@/constants/permissions';
import { USERS_RESOURCE, USER_PERMS, setUserStatus, resetUserPassword } from './api';
import { ROLE_LABELS, ASSIGNABLE_ROLES, type User } from './types';
import { userColumns } from './components/user-columns';

const USER_FILTER_KEYS = ['role', 'is_active'];
const ROLE_OPTIONS = [{ value: '', label: 'All roles' }, ...ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r }))];
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Disabled' },
];

export function UserListPage() {
  const { hasRole, roles } = usePermissions();
  const filters = useFilters({ keys: USER_FILTER_KEYS });
  const table = useDataTable();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<User | null>(null);

  const query = useMemo(
    () => ({ ...filters.query, page: filters.page, ordering: table.ordering ?? filters.query.ordering }),
    [filters.query, filters.page, table.ordering],
  );
  const list = useCrudList<User>(USERS_RESOURCE, query);

  async function toggleStatus(user: User) {
    setBusyId(user.id);
    try {
      await setUserStatus(user.id, !user.is_active);
      await invalidateResource(queryClient, USERS_RESOURCE);
      toast.success(user.is_active ? 'User disabled.' : 'User activated.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo(
    () =>
      userColumns((u) => (
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={`${ROUTES.users}/${u.id}/edit`}>Edit</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setResetFor(u)}>
            Reset password
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isLoading={busyId === u.id}
            onClick={() => void toggleStatus(u)}
          >
            {u.is_active ? 'Disable' : 'Activate'}
          </Button>
        </div>
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId],
  );

  if (!hasRole(ROLE_KEYS.superAdmin)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users" />
        <ForbiddenState />
      </div>
    );
  }

  const rows = list.data?.items ?? [];
  const pagination = list.data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Administrator accounts and their roles. Only Super Admins can manage users."
        actions={
          <Can permission={USER_PERMS.manage} role={roles}>
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href={`${ROUTES.users}/new`}>New user</Link>
            </Button>
          </Can>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="user-filter-role">Role</Label>
          <Select
            id="user-filter-role"
            value={filters.filters.role ?? ''}
            onChange={(e) => filters.setFilter('role', e.target.value || undefined)}
            options={ROLE_OPTIONS}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="user-filter-status">Status</Label>
          <Select
            id="user-filter-status"
            value={filters.filters.is_active ?? ''}
            onChange={(e) => filters.setFilter('is_active', e.target.value || undefined)}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="user-search">Search</Label>
          <SearchInput
            value={filters.search}
            onValueChange={filters.setSearch}
            placeholder="Search name or email…"
          />
        </div>
      </div>

      {filters.isActive ? (
        <Button variant="ghost" size="sm" onClick={filters.reset}>
          Clear filters
        </Button>
      ) : null}

      <Card className="p-0">
        <DataTable<User>
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
          onRetry={() => void list.refetch()}
          emptyState={
            <EmptyState
              icon={UsersIcon}
              title={filters.isActive ? 'No users match your filters' : 'No users yet'}
              description={filters.isActive ? 'Try adjusting or clearing the filters.' : 'Create the first administrator.'}
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

      <ResetPasswordDialog user={resetFor} onClose={() => setResetFor(null)} />
    </div>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!user) return;
    setSaving(true);
    try {
      await resetUserPassword(user.id, password);
      toast.success('Password reset.');
      setPassword('');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={user !== null}
      onClose={onClose}
      title={user ? `Reset password — ${user.full_name}` : 'Reset password'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} isLoading={saving} disabled={password.length < 8}>
            Reset password
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="reset-password">New password</Label>
        <Input
          id="reset-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters, a letter and a number"
        />
      </div>
    </Dialog>
  );
}
