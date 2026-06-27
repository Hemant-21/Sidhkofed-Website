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
        </div>
      ),
    },
    {
      id: 'roles',
      header: 'Roles',
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.length > 0
            ? u.roles.map((r) => (
                <Badge key={r} tone="default" className="text-xs">
                  {humanize(r)}
                </Badge>
              ))
            : <span className="text-sm text-muted-foreground">No roles</span>}
        </div>
      ),
    },
    {
      id: 'is_active',
      header: 'Status',
      cell: (u) => (
        <Badge tone={u.is_active ? 'success' : 'danger'}>
          {u.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'last_login_at',
      header: 'Last login',
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
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      isActionColumn: true,
      align: 'right',
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
}
