import Link from 'next/link';
import { Home } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { TenderSummary } from '../types';

const TENDER_STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'muted' | 'default'> = {
  open: 'success',
  closed: 'muted',
  cancelled: 'danger',
  awarded: 'info' as 'default',
};

function TenderStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const tone = TENDER_STATUS_TONE[status] ?? 'default';
  return (
    <Badge tone={tone}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function tenderColumns(
  actions?: (row: TenderSummary) => React.ReactNode,
): ColumnDef<TenderSummary>[] {
  const cols: ColumnDef<TenderSummary>[] = [
    {
      id: 'title',
      header: 'Tender',
      sortField: 'title_en',
      cell: (t) => (
        <div className="min-w-0">
          <Link
            href={`${ROUTES.tenders}/${t.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {t.title_en}
          </Link>
          {t.tender_number ? (
            <p className="truncate text-xs text-muted-foreground">No: {t.tender_number}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'tender_type',
      header: 'Type',
      cell: (t) => <span className="text-muted-foreground">{t.tender_type?.name_en ?? '—'}</span>,
    },
    {
      id: 'submission_deadline',
      header: 'Deadline',
      sortField: 'submission_deadline',
      cell: (t) => formatDate(t.submission_deadline),
    },
    {
      id: 'tender_status',
      header: 'Tender status',
      cell: (t) => <TenderStatusBadge status={t.tender_status} />,
    },
    {
      id: 'publication_state',
      header: 'State',
      cell: (t) => <StatusBadge state={t.publication_state} />,
    },
    {
      id: 'issuing_authority',
      header: 'Authority',
      defaultHidden: true,
      cell: (t) => <span className="text-muted-foreground">{t.issuing_authority ?? '—'}</span>,
    },
    {
      id: 'highlight',
      header: 'Highlight',
      align: 'center',
      defaultHidden: true,
      cell: (t) =>
        t.highlight_type ? (
          <HighlightBadge highlight={t.highlight_type} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      cell: (t) =>
        t.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'updated_at',
      header: 'Updated',
      sortField: 'created_at',
      cell: (t) => (
        <span className="text-muted-foreground" title={t.updated_at}>
          {formatRelative(t.updated_at)}
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
      cell: (t) => actions(t),
    });
  }
  return cols;
}
