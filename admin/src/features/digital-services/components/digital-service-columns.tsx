import Link from 'next/link';
import { Home, ExternalLink, AppWindow } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { DigitalServiceSummary } from '../types';

/**
 * Digital Services list column definitions. Sort fields map to the backend ordering allow-list
 * (digital-services.types.ts): `title_en`, `display_order`, `published_at`, `created_at`,
 * `updated_at`. The external URL opens in a new tab with rel="noopener noreferrer".
 */
export function digitalServiceColumns(
  actions?: (row: DigitalServiceSummary) => React.ReactNode,
): ColumnDef<DigitalServiceSummary>[] {
  const cols: ColumnDef<DigitalServiceSummary>[] = [
    {
      id: 'title',
      header: 'Service',
      sortField: 'title_en',
      cell: (s) => (
        <div className="flex min-w-0 items-center gap-2">
          {s.icon?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.icon.url} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
          ) : (
            <AppWindow className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <Link
              href={`${ROUTES.digitalServices}/${s.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {s.title_en}
            </Link>
            {s.title_hi ? <p className="truncate text-xs text-muted-foreground">{s.title_hi}</p> : null}
          </div>
        </div>
      ),
    },
    {
      id: 'external_url',
      header: 'External URL',
      cell: (s) => (
        <a
          href={s.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-[260px] items-center gap-1 truncate text-primary hover:underline"
          title={s.external_url}
        >
          <span className="truncate">{s.external_url}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ),
    },
    {
      id: 'publication_state',
      header: 'State',
      cell: (s) => <StatusBadge state={s.publication_state} />,
    },
    {
      id: 'highlight',
      header: 'Highlight',
      align: 'center',
      defaultHidden: true,
      cell: (s) =>
        s.highlight_type ? (
          <HighlightBadge highlight={s.highlight_type} />
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
      cell: (s) => <span className="text-muted-foreground">{s.display_order ?? '—'}</span>,
    },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      cell: (s) =>
        s.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'updated_at',
      header: 'Updated',
      sortField: 'updated_at',
      cell: (s) => (
        <span className="text-muted-foreground" title={s.updated_at}>
          {formatRelative(s.updated_at)}
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
      cell: (s) => actions(s),
    });
  }
  return cols;
}
