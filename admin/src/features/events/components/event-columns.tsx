import Link from 'next/link';
import { Home } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { formatDate, formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { EventSummary } from '../types';
import { EventStatusBadge } from './event-status-badge';

/**
 * Event list column definitions (reused by the DataTable). Pure presentation — sort fields map
 * to the backend ordering allow-list (`start_date`, `display_order`, `-published_at`,
 * `created_at`). The Actions column is rendered by the list page so it can wire navigation.
 */
export function eventColumns(actions?: (row: EventSummary) => React.ReactNode): ColumnDef<EventSummary>[] {
  const cols: ColumnDef<EventSummary>[] = [
    {
      id: 'title',
      header: 'Title',
      cell: (e) => (
        <div className="min-w-0">
          <Link
            href={`${ROUTES.events}/${e.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {e.title_en}
          </Link>
          {e.location_text ? (
            <p className="truncate text-xs text-muted-foreground">{e.location_text}</p>
          ) : null}
        </div>
      ),
    },
    { id: 'event_type', header: 'Type', cell: (e) => <span className="text-muted-foreground">{e.event_type.name_en}</span> },
    { id: 'status', header: 'Status', cell: (e) => <EventStatusBadge status={e.event_status} /> },
    { id: 'start_date', header: 'Start', sortField: 'start_date', cell: (e) => formatDate(e.start_date) },
    { id: 'end_date', header: 'End', cell: (e) => formatDate(e.end_date) },
    {
      id: 'district',
      header: 'District',
      cell: (e) => e.district?.name_en ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'publication_state',
      header: 'State',
      cell: (e) => <StatusBadge state={e.publication_state} />,
    },
    {
      id: 'highlight',
      header: 'Highlight',
      align: 'center',
      defaultHidden: true,
      cell: (e) => (e.highlight_type ? <HighlightBadge highlight={e.highlight_type} /> : <span className="text-muted-foreground">—</span>),
    },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      defaultHidden: true,
      cell: (e) =>
        e.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'updated_at',
      header: 'Updated',
      sortField: 'created_at',
      cell: (e) => <span className="text-muted-foreground" title={e.updated_at}>{formatRelative(e.updated_at)}</span>,
    },
  ];

  if (actions) {
    cols.push({
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      isActionColumn: true,
      align: 'right',
      cell: (e) => actions(e),
    });
  }
  return cols;
}
