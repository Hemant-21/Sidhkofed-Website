import Link from 'next/link';
import { Home } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { formatDate, formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { ProgrammeSummary } from '../types';

/**
 * Programme list column definitions (reused by the DataTable). Pure presentation — sort fields map
 * to the backend ordering allow-list (programmes.types.ts): `title_en`, `start_date`,
 * `display_order`, `published_at`, `created_at`. The Actions column is rendered by the list page so
 * it can wire navigation.
 *
 * NOTE: the admin programme LIST summary (programmes.dto.ts → ProgrammeSummaryDto) does not include
 * commodity/training-type counts — those linked masters live on the DETAIL payload. We surface only
 * what the list contract returns; counts appear on the detail page.
 */
export function programmeColumns(actions?: (row: ProgrammeSummary) => React.ReactNode): ColumnDef<ProgrammeSummary>[] {
  const cols: ColumnDef<ProgrammeSummary>[] = [
    {
      id: 'title',
      header: 'Programme',
      sortField: 'title_en',
      cell: (p) => (
        <div className="min-w-0">
          <Link
            href={`${ROUTES.programmes}/${p.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {p.title_en}
          </Link>
          {p.short_code ? <p className="truncate text-xs text-muted-foreground">{p.short_code}</p> : null}
        </div>
      ),
    },
    { id: 'funding_source', header: 'Funding source', cell: (p) => <span className="text-muted-foreground">{p.funding_source ?? '—'}</span> },
    {
      id: 'start_date',
      header: 'Start',
      sortField: 'start_date',
      cell: (p) => formatDate(p.start_date),
    },
    { id: 'end_date', header: 'End', cell: (p) => formatDate(p.end_date) },
    { id: 'publication_state', header: 'State', cell: (p) => <StatusBadge state={p.publication_state} /> },
    {
      id: 'highlight',
      header: 'Highlight',
      align: 'center',
      defaultHidden: true,
      cell: (p) =>
        p.highlight_type ? <HighlightBadge highlight={p.highlight_type} /> : <span className="text-muted-foreground">—</span>,
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
