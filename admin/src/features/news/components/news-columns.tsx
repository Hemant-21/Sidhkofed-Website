import Link from 'next/link';
import { Home } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { formatDate, formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { NewsSummary } from '../types';

/** News list columns. Sort fields map to the backend allow-list (-news_published_at, etc.). */
export function newsColumns(actions?: (row: NewsSummary) => React.ReactNode): ColumnDef<NewsSummary>[] {
  const cols: ColumnDef<NewsSummary>[] = [
    {
      id: 'title',
      header: 'Title',
      cell: (n) => (
        <Link href={`${ROUTES.news}/${n.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
          {n.title_en}
        </Link>
      ),
    },
    {
      id: 'source_event',
      header: 'Related event',
      cell: (n) => (
        <Link href={`${ROUTES.events}/${n.source_event.id}`} className="text-muted-foreground hover:text-primary hover:underline">
          {n.source_event.title_en}
        </Link>
      ),
    },
    {
      id: 'news_published_at',
      header: 'Published',
      sortField: 'news_published_at',
      cell: (n) => formatDate(n.news_published_at),
    },
    { id: 'publication_state', header: 'State', cell: (n) => <StatusBadge state={n.publication_state} /> },
    {
      id: 'highlight',
      header: 'Highlight',
      align: 'center',
      defaultHidden: true,
      cell: (n) => (n.highlight_type ? <HighlightBadge highlight={n.highlight_type} /> : <span className="text-muted-foreground">—</span>),
    },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      cell: (n) =>
        n.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'updated_at',
      header: 'Updated',
      cell: (n) => <span className="text-muted-foreground">{formatRelative(n.updated_at)}</span>,
    },
  ];

  if (actions) {
    cols.push({ id: 'actions', header: <span className="sr-only">Actions</span>, isActionColumn: true, align: 'right', cell: (n) => actions(n) });
  }
  return cols;
}
