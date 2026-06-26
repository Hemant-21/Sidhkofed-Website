<<<<<<< HEAD
import { Badge } from '@/components/ui/badge';
import type { ColumnDef } from '@/types/table';
import { formatRelative } from '@/utils/date';
import { ROLE_LABELS, type User } from '../types';

/** User list columns. Sortable fields map to the backend allow-list (users.types.ts). */
export function userColumns(actions?: (row: User) => React.ReactNode): ColumnDef<User>[] {
  const cols: ColumnDef<User>[] = [
    {
      id: 'full_name',
      header: 'Name',
      sortField: 'full_name',
      cell: (u) => (
        <div className="min-w-0">
          <span className="font-medium text-foreground">{u.full_name}</span>
          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
=======
import Link from 'next/link';
import type { ColumnDef } from '@/types/table';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatDateTime, formatRelative } from '@/utils/date';
import { humanize } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import type { AdminUser } from '../types';

export function userColumns(): ColumnDef<AdminUser>[] {
  return [
    {
      id: 'full_name',
      header: 'User',
      sortField: 'full_name',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.full_name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{u.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
        </div>
      ),
    },
    {
      id: 'roles',
      header: 'Roles',
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
<<<<<<< HEAD
          {u.roles.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            u.roles.map((r) => (
              <Badge key={r} tone="default">
                {ROLE_LABELS[r] ?? r}
              </Badge>
            ))
          )}
=======
          {u.roles.length > 0
            ? u.roles.map((r) => (
                <Badge key={r} tone="default" className="text-xs">
                  {humanize(r)}
                </Badge>
              ))
            : <span className="text-sm text-muted-foreground">No roles</span>}
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
        </div>
      ),
    },
    {
      id: 'is_active',
      header: 'Status',
<<<<<<< HEAD
      align: 'center',
      cell: (u) => <Badge tone={u.is_active ? 'success' : 'warning'}>{u.is_active ? 'Active' : 'Disabled'}</Badge>,
=======
      cell: (u) => (
        <Badge tone={u.is_active ? 'success' : 'danger'}>
          {u.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
    },
    {
      id: 'last_login_at',
      header: 'Last login',
<<<<<<< HEAD
      sortField: 'last_login_at',
      cell: (u) => (
        <span className="text-muted-foreground" title={u.last_login_at ?? undefined}>
          {u.last_login_at ? formatRelative(u.last_login_at) : 'Never'}
        </span>
      ),
    },
  ];

  if (actions) {
    cols.push({
=======
      defaultHidden: false,
      cell: (u) =>
        u.last_login_at ? (
          <span className="whitespace-nowrap text-sm text-muted-foreground" title={formatDateTime(u.last_login_at)}>
            {formatRelative(u.last_login_at)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Never</span>
        ),
    },
    {
      id: 'created_at',
      header: 'Created',
      defaultHidden: true,
      sortField: 'created_at',
      cell: (u) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatDateTime(u.created_at)}
        </span>
      ),
    },
    {
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      isActionColumn: true,
      align: 'right',
<<<<<<< HEAD
      cell: (u) => actions(u),
    });
  }
  return cols;
=======
      cell: (u) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`${ROUTES.users}/${u.id}`}
            className="text-sm text-primary hover:underline"
          >
            View
          </Link>
          <Link
            href={`${ROUTES.users}/${u.id}/edit`}
            className="text-sm text-primary hover:underline"
          >
            Edit
          </Link>
        </div>
      ),
    },
  ];
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
}
