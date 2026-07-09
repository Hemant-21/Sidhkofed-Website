import Link from 'next/link';
import { UserRound } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { LeadershipSummary } from '../types';

/**
 * Leadership list column definitions. Sort fields map to the backend ordering allow-list
 * (leadership.types.ts): `name_en`, `display_order`, `published_at`, `created_at`, `updated_at`.
 */
export function leadershipColumns(
  actions?: (row: LeadershipSummary) => React.ReactNode,
): ColumnDef<LeadershipSummary>[] {
  const cols: ColumnDef<LeadershipSummary>[] = [
    {
      id: 'name',
      header: 'Name',
      sortField: 'name_en',
      cell: (s) => (
        <div className="flex min-w-0 items-center gap-2">
          {s.photo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.photo.url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
          ) : (
            <UserRound className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <Link
              href={`${ROUTES.leadership}/${s.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {s.name_en}
            </Link>
            {s.name_hi ? <p className="truncate text-xs text-muted-foreground">{s.name_hi}</p> : null}
          </div>
        </div>
      ),
    },
    {
      id: 'govt_role',
      header: 'Government Role',
      cell: (s) => <span className="truncate text-foreground">{s.govt_role_en}</span>,
    },
    {
      id: 'sidhkofed_role',
      header: 'SIDHKOFED Role',
      cell: (s) => <span className="truncate text-foreground">{s.sidhkofed_role_en}</span>,
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
      cell: (s) => <span className="text-muted-foreground">{s.display_order ?? '—'}</span>,
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
