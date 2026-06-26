import Link from 'next/link';
import { Home } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { formatDate, formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { CommunicationSummary } from '../types';

/**
 * Official Communications list column definitions. Sort fields map to the backend ordering
 * allow-list: `title_en`, `issue_date`, `display_order`, `published_at`, `created_at`.
 */
export function communicationColumns(
  actions?: (row: CommunicationSummary) => React.ReactNode,
): ColumnDef<CommunicationSummary>[] {
  const cols: ColumnDef<CommunicationSummary>[] = [
    {
      id: 'title',
      header: 'Title',
      sortField: 'title_en',
      cell: (c) => (
        <div className="min-w-0">
          <Link
            href={`${ROUTES.communications}/${c.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {c.title_en}
          </Link>
          {c.reference_number ? (
            <p className="truncate text-xs text-muted-foreground">Ref: {c.reference_number}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'communication_type',
      header: 'Type',
      cell: (c) => (
        <span className="text-muted-foreground">{c.communication_type?.name_en ?? '—'}</span>
      ),
    },
    {
      id: 'issuing_authority',
      header: 'Authority',
      defaultHidden: true,
      cell: (c) => <span className="text-muted-foreground">{c.issuing_authority ?? '—'}</span>,
    },
    {
      id: 'issue_date',
      header: 'Issue date',
      sortField: 'issue_date',
      cell: (c) => formatDate(c.issue_date),
    },
    {
      id: 'effective_date',
      header: 'Effective',
      defaultHidden: true,
      cell: (c) => formatDate(c.effective_date),
    },
    {
      id: 'expiry_date',
      header: 'Expires',
      defaultHidden: true,
      cell: (c) =>
        c.expiry_date ? (
          <span className="text-muted-foreground">{formatDate(c.expiry_date)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'publication_state',
      header: 'State',
      cell: (c) => <StatusBadge state={c.publication_state} />,
    },
    {
      id: 'highlight',
      header: 'Highlight',
      align: 'center',
      defaultHidden: true,
      cell: (c) =>
        c.highlight_type ? (
          <HighlightBadge highlight={c.highlight_type} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      cell: (c) =>
        c.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'updated_at',
      header: 'Updated',
      sortField: 'created_at',
      cell: (c) => (
        <span className="text-muted-foreground" title={c.updated_at}>
          {formatRelative(c.updated_at)}
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
      cell: (c) => actions(c),
    });
  }
  return cols;
}
