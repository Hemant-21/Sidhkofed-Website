import Link from 'next/link';
import { Home } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { PageSummary } from '../types';

/**
 * Pages list column definitions. Sort fields map to the backend ordering allow-list
 * (pages.types.ts): `title_en`, `display_order`, `published_at`, `created_at`, `updated_at`.
 */
export function pageColumns(actions?: (row: PageSummary) => React.ReactNode): ColumnDef<PageSummary>[] {
  const cols: ColumnDef<PageSummary>[] = [
    {
      id: 'title',
      header: 'Title',
      sortField: 'title_en',
      cell: (p) => (
        <div className="min-w-0">
          <Link
            href={`${ROUTES.pages}/${p.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {p.title_en}
          </Link>
          {p.title_hi ? <p className="truncate text-xs text-muted-foreground">{p.title_hi}</p> : null}
        </div>
      ),
    },
    {
      id: 'slug',
      header: 'Slug',
      cell: (p) => <code className="text-xs text-muted-foreground">/{p.slug}</code>,
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
      id: 'display_order',
      header: 'Order',
      align: 'center',
      sortField: 'display_order',
      defaultHidden: true,
      cell: (p) => <span className="text-muted-foreground">{p.display_order ?? '—'}</span>,
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
      sortField: 'updated_at',
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
