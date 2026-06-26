import Link from 'next/link';
import { Home, PlaySquare } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { Video } from '../types';

/**
 * Video list column definitions. The video list is NOT server-sortable (no `ordering` param —
 * video.controller.ts), so no `sortField` is set. Surfaces the contract: thumbnail, title,
 * publication state, homepage, updated. (Duration/highlight are not stored by the backend.)
 */
export function videoColumns(actions?: (row: Video) => React.ReactNode): ColumnDef<Video>[] {
  const cols: ColumnDef<Video>[] = [
    {
      id: 'thumbnail',
      header: <span className="sr-only">Thumbnail</span>,
      width: '6rem',
      cell: (v) => (
        <div className="relative flex h-9 w-16 items-center justify-center overflow-hidden rounded bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          <PlaySquare className="absolute h-4 w-4 text-white/90 drop-shadow" aria-hidden="true" />
        </div>
      ),
    },
    {
      id: 'title',
      header: 'Title',
      cell: (v) => (
        <div className="min-w-0">
          <Link href={`${ROUTES.videos}/${v.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
            {v.title_en}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{v.youtube_id}</p>
        </div>
      ),
    },
    { id: 'publication_state', header: 'State', cell: (v) => <StatusBadge state={v.publication_state} /> },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      cell: (v) =>
        v.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'updated_at',
      header: 'Updated',
      cell: (v) => (
        <span className="text-muted-foreground" title={v.updated_at}>
          {formatRelative(v.updated_at)}
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
      cell: (v) => actions(v),
    });
  }
  return cols;
}
