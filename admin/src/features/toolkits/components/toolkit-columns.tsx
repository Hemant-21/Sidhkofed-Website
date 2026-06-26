import Link from 'next/link';
import { Home } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { ToolkitSummary } from '../types';

/**
 * Toolkit list column definitions (reused by the DataTable). Pure presentation — sort fields map to
 * the backend ordering allow-list (toolkits.types.ts): `title_en`, `display_order`, `published_at`,
 * `created_at`. The Actions column is rendered by the list page so it can wire navigation.
 *
 * NOTE: the admin toolkit LIST summary (toolkits.dto.ts → ToolkitSummaryDto) does not include item
 * counts or distribution figures — items live on the DETAIL payload and distribution totals are a
 * separate read-only aggregate. We surface only what the list contract returns.
 */
export function toolkitColumns(actions?: (row: ToolkitSummary) => React.ReactNode): ColumnDef<ToolkitSummary>[] {
  const cols: ColumnDef<ToolkitSummary>[] = [
    {
      id: 'title',
      header: 'Toolkit',
      sortField: 'title_en',
      cell: (t) => (
        <div className="min-w-0">
          <Link
            href={`${ROUTES.toolkits}/${t.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {t.title_en}
          </Link>
          {t.summary_en ? <p className="truncate text-xs text-muted-foreground">{t.summary_en}</p> : null}
        </div>
      ),
    },
    { id: 'programme', header: 'Programme', cell: (t) => <span className="text-muted-foreground">{t.programme?.title_en ?? '—'}</span> },
    { id: 'commodity', header: 'Commodity', cell: (t) => <span className="text-muted-foreground">{t.commodity?.name_en ?? '—'}</span> },
    { id: 'publication_state', header: 'State', cell: (t) => <StatusBadge state={t.publication_state} /> },
    {
      id: 'highlight',
      header: 'Highlight',
      align: 'center',
      defaultHidden: true,
      cell: (t) =>
        t.highlight_type ? <HighlightBadge highlight={t.highlight_type} /> : <span className="text-muted-foreground">—</span>,
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
