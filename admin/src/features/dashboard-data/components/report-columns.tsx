import Link from 'next/link';
import { Eye, EyeOff, Home } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { DashboardReportSummary } from '../types';

/**
 * Dashboard report list columns. Reports are a FIXED set (no builder); the list shows each report's
 * identity, public visibility, and publication state. Sort fields map to the backend ordering
 * allow-list (dashboard.types.ts REPORT_ORDERING_FIELDS): `display_order`, `published_at`,
 * `created_at`. Columns follow the task spec: Report Name, Status, Last Updated, Actions (plus
 * visibility + homepage affordances).
 */
export function reportColumns(
  actions?: (row: DashboardReportSummary) => React.ReactNode,
): ColumnDef<DashboardReportSummary>[] {
  const cols: ColumnDef<DashboardReportSummary>[] = [
    {
      id: 'title',
      header: 'Report',
      cell: (r) => (
        <div className="min-w-0">
          <Link
            href={`${ROUTES.dashboardReports}/${r.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {r.title_en}
          </Link>
          <p className="truncate font-mono text-xs text-muted-foreground">{r.report_key}</p>
        </div>
      ),
    },
    {
      id: 'public_visibility',
      header: 'Public',
      align: 'center',
      cell: (r) =>
        r.public_visibility ? (
          <Eye className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Public" />
        ) : (
          <EyeOff className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Hidden from public" />
        ),
    },
    {
      id: 'is_active',
      header: 'Active',
      align: 'center',
      defaultHidden: true,
      cell: (r) =>
        r.is_active ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="muted">Inactive</Badge>
        ),
    },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      defaultHidden: true,
      cell: (r) =>
        r.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'display_order',
      header: 'Order',
      sortField: 'display_order',
      align: 'center',
      defaultHidden: true,
      cell: (r) => (r.display_order != null ? r.display_order : '—'),
    },
    {
      id: 'publication_state',
      header: 'State',
      cell: (r) => <StatusBadge state={r.publication_state} />,
    },
    {
      id: 'updated_at',
      header: 'Last updated',
      sortField: 'created_at',
      cell: (r) => (
        <span className="text-muted-foreground" title={r.updated_at}>
          {formatRelative(r.updated_at)}
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
      cell: (r) => actions(r),
    });
  }
  return cols;
}
