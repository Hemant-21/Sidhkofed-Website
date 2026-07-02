import Link from 'next/link';
import { Home, Images } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { GallerySummary } from '../types';

/**
 * Galleries list columns. The backend gallery list has no `ordering` allow-list (only
 * publication_state + search), so columns are intentionally NOT sortable — we never send a no-op
 * ordering param.
 */
export function galleryColumns(
  actions?: (row: GallerySummary) => React.ReactNode,
): ColumnDef<GallerySummary>[] {
  const cols: ColumnDef<GallerySummary>[] = [
    {
      id: 'title',
      header: 'Title',
      cell: (g) => (
        <div className="flex min-w-0 items-center gap-3">
          {g.cover_media?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={g.cover_media.url}
              alt=""
              className="h-10 w-14 shrink-0 rounded object-cover"
              loading="lazy"
            />
          ) : (
            <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
              <Images className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <Link
              href={`${ROUTES.galleries}/${g.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {g.title_en}
            </Link>
            {g.title_hi ? <p className="truncate text-xs text-muted-foreground">{g.title_hi}</p> : null}
          </div>
        </div>
      ),
    },
    {
      id: 'image_count',
      header: 'Images',
      align: 'center',
      cell: (g) => <span className="text-muted-foreground">{g.image_count}</span>,
    },
    {
      id: 'publication_state',
      header: 'State',
      cell: (g) => <StatusBadge state={g.publication_state} />,
    },
    {
      id: 'display_order',
      header: 'Order',
      align: 'center',
      defaultHidden: true,
      cell: (g) => <span className="text-muted-foreground">{g.display_order ?? '—'}</span>,
    },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      cell: (g) =>
        g.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'updated_at',
      header: 'Updated',
      cell: (g) => (
        <span className="text-muted-foreground" title={g.updated_at}>
          {formatRelative(g.updated_at)}
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
      cell: (g) => actions(g),
    });
  }
  return cols;
}
