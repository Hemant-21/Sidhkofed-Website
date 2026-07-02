import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ColumnDef } from '@/types/table';
import type { StatusTone } from '@/constants/status';
import { formatDateTime } from '@/utils/date';
import type { AuditLog } from '../types';

/** Map an audit action to a badge tone so destructive/lifecycle actions read at a glance. */
const ACTION_TONE: Record<string, StatusTone> = {
  create: 'success',
  update: 'info',
  publish: 'success',
  unpublish: 'warning',
  archive: 'warning',
  restore: 'info',
  media_replace: 'info',
  config_change: 'warning',
  master_change: 'info',
  login: 'default',
};

/** Audit log column definitions. Read-only; the only sortable field is `created_at`. */
export function auditColumns(onView: (row: AuditLog) => void): ColumnDef<AuditLog>[] {
  return [
    {
      id: 'created_at',
      header: 'When',
      sortField: 'created_at',
      cell: (a) => (
        <span className="whitespace-nowrap text-muted-foreground" title={a.created_at}>
          {formatDateTime(a.created_at)}
        </span>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: (a) => <Badge tone={ACTION_TONE[a.action] ?? 'default'}>{a.event ?? a.action}</Badge>,
    },
    {
      id: 'module',
      header: 'Module',
      cell: (a) => <span className="text-foreground">{a.module}</span>,
    },
    {
      id: 'user',
      header: 'User',
      cell: (a) => (
        <span className="text-muted-foreground">{a.user ? a.user.full_name : 'System'}</span>
      ),
    },
    {
      id: 'summary',
      header: 'Summary',
      defaultHidden: true,
      cell: (a) => <span className="text-muted-foreground">{a.change_summary ?? '—'}</span>,
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      isActionColumn: true,
      align: 'right',
      cell: (a) => (
        <Button variant="ghost" size="sm" onClick={() => onView(a)}>
          View
        </Button>
      ),
    },
  ];
}
