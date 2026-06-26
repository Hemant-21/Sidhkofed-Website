import Link from 'next/link';
import type { ColumnDef } from '@/types/table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatRelative } from '@/utils/date';
import { humanize } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import type { AuditLogEntry } from '../types';
import { AuditActionBadge } from './audit-action-badge';

/**
 * Audit list column definitions (task: Timestamp, User, Module, Action, Entity, Result). The only
 * sortable field is the backend ordering allow-list value `created_at` (audit.controller.ts
 * ORDERING_ALLOW). "Result" maps to the publication state transition the action produced
 * (previous → new); the audit DTO exposes no separate result field, so we render the real
 * `previous_state → new_state` transition rather than inventing one. No IP column — the DTO never
 * exposes an IP address.
 */
export function auditColumns(
  actions?: (row: AuditLogEntry) => React.ReactNode,
): ColumnDef<AuditLogEntry>[] {
  const cols: ColumnDef<AuditLogEntry>[] = [
    {
      id: 'created_at',
      header: 'Timestamp',
      sortField: 'created_at',
      cell: (a) => (
        <span className="whitespace-nowrap text-sm text-foreground" title={a.created_at}>
          {formatDateTime(a.created_at)}
          <span className="ml-1 text-xs text-muted-foreground">({formatRelative(a.created_at)})</span>
        </span>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: (a) => <AuditActionBadge action={a.action} />,
    },
    {
      id: 'module',
      header: 'Module',
      cell: (a) => <span className="text-sm text-foreground">{humanize(a.module)}</span>,
    },
    {
      id: 'user',
      header: 'User',
      cell: (a) =>
        a.user ? (
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{a.user.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{a.user.email}</p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">System</span>
        ),
    },
    {
      id: 'record_id',
      header: 'Entity',
      defaultHidden: true,
      cell: (a) =>
        a.record_id ? (
          <code className="text-xs text-muted-foreground" title={a.record_id}>
            {a.record_id.slice(0, 8)}…
          </code>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'result',
      header: 'Result',
      cell: (a) =>
        a.previous_state || a.new_state ? (
          <span className="flex items-center gap-1 whitespace-nowrap text-xs">
            {a.previous_state ? <Badge tone="muted">{humanize(a.previous_state)}</Badge> : null}
            {a.previous_state && a.new_state ? (
              <span className="text-muted-foreground">→</span>
            ) : null}
            {a.new_state ? <Badge tone="default">{humanize(a.new_state)}</Badge> : null}
          </span>
        ) : (
          <span className="truncate text-sm text-muted-foreground" title={a.change_summary ?? undefined}>
            {a.change_summary ?? a.event ?? '—'}
          </span>
        ),
    },
    {
      id: 'summary',
      header: 'Summary',
      defaultHidden: true,
      cell: (a) => (
        <span className="block max-w-xs truncate text-sm text-muted-foreground" title={a.change_summary ?? undefined}>
          {a.change_summary ?? a.event ?? '—'}
        </span>
      ),
    },
  ];

  cols.push({
    id: 'actions',
    header: <span className="sr-only">Actions</span>,
    isActionColumn: true,
    align: 'right',
    cell: (a) =>
      actions ? (
        actions(a)
      ) : (
        <Link
          href={`${ROUTES.auditLog}/${a.id}`}
          className="text-sm text-primary hover:underline"
        >
          View
        </Link>
      ),
  });
  return cols;
}
