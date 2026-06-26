import Link from 'next/link';
import { Home } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { ProcurementSummary } from '../types';

const STATUS_TONE: Record<string, 'success' | 'muted' | 'warning' | 'default'> = {
  active: 'success',
  closed: 'muted',
  upcoming: 'warning',
};

function ProcurementStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const tone = STATUS_TONE[status] ?? 'default';
  return (
    <Badge tone={tone}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function procurementColumns(
  actions?: (row: ProcurementSummary) => React.ReactNode,
): ColumnDef<ProcurementSummary>[] {
  const cols: ColumnDef<ProcurementSummary>[] = [
    {
      id: 'title',
      header: 'Title',
      sortField: 'title_en',
      cell: (p) => (
        <div className="min-w-0">
          <Link
            href={`${ROUTES.procurement}/${p.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {p.title_en}
          </Link>
          {p.procurement_update_type ? (
            <p className="truncate text-xs text-muted-foreground">
              {p.procurement_update_type.name_en}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'commodity',
      header: 'Commodity',
      cell: (p) => (
        <span className="text-muted-foreground">{p.commodity?.name_en ?? '—'}</span>
      ),
    },
    {
      id: 'district',
      header: 'District',
      defaultHidden: true,
      cell: (p) => (
        <span className="text-muted-foreground">{p.district?.name_en ?? '—'}</span>
      ),
    },
    {
      id: 'effective_date',
      header: 'Effective',
      sortField: 'effective_date',
      cell: (p) => formatDate(p.effective_date),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (p) => <ProcurementStatusBadge status={p.status} />,
    },
    {
      id: 'publication_state',
      header: 'State',
      cell: (p) => <StatusBadge state={p.publication_state} />,
    },
    {
      id: 'highlight',
      header: 'Highlight',
      align: 'center',
      defaultHidden: true,
      cell: (p) =>
        p.highlight_type ? (
          <HighlightBadge highlight={p.highlight_type} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      cell: (p) =>
        p.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'updated_at',
      header: 'Updated',
      sortField: 'created_at',
      cell: (p) => (
        <span className="text-muted-foreground" title={p.updated_at}>
          {formatRelative(p.updated_at)}
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
      cell: (p) => actions(p),
    });
  }
  return cols;
}
