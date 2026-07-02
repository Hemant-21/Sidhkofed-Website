import Link from 'next/link';
import { Home } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { FaqSummary } from '../types';

/**
 * FAQ list column definitions. Sort fields map to the backend ordering allow-list (faqs.types.ts):
 * `display_order`, `published_at`, `created_at`, `updated_at`. (Question is not a sortable field.)
 */
export function faqColumns(actions?: (row: FaqSummary) => React.ReactNode): ColumnDef<FaqSummary>[] {
  const cols: ColumnDef<FaqSummary>[] = [
    {
      id: 'question',
      header: 'Question',
      cell: (f) => (
        <div className="min-w-0">
          <Link
            href={`${ROUTES.faqs}/${f.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {f.question_en}
          </Link>
          {f.question_hi ? (
            <p className="truncate text-xs text-muted-foreground">{f.question_hi}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'faq_category',
      header: 'Category',
      cell: (f) => <span className="text-muted-foreground">{f.faq_category?.name_en ?? '—'}</span>,
    },
    {
      id: 'publication_state',
      header: 'State',
      cell: (f) => <StatusBadge state={f.publication_state} />,
    },
    {
      id: 'highlight',
      header: 'Highlight',
      align: 'center',
      defaultHidden: true,
      cell: (f) =>
        f.highlight_type ? (
          <HighlightBadge highlight={f.highlight_type} />
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
      cell: (f) => <span className="text-muted-foreground">{f.display_order ?? '—'}</span>,
    },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      defaultHidden: true,
      cell: (f) =>
        f.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'updated_at',
      header: 'Updated',
      sortField: 'updated_at',
      cell: (f) => (
        <span className="text-muted-foreground" title={f.updated_at}>
          {formatRelative(f.updated_at)}
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
      cell: (f) => actions(f),
    });
  }
  return cols;
}
