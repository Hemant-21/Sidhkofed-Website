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
        </div>
      ),
    },
    {
      id: 'roles',
      header: 'Roles',
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            u.roles.map((r) => (
              <Badge key={r} tone="default">
                {ROLE_LABELS[r] ?? r}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      id: 'is_active',
      header: 'Status',
      align: 'center',
      cell: (u) => <Badge tone={u.is_active ? 'success' : 'warning'}>{u.is_active ? 'Active' : 'Disabled'}</Badge>,
    },
    {
      id: 'last_login_at',
      header: 'Last login',
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
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      isActionColumn: true,
      align: 'right',
      cell: (u) => actions(u),
    });
  }
  return cols;
}
