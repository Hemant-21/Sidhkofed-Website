import Link from 'next/link';
import { Home, Building2 } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { InstitutionSummary } from '../types';

/**
 * Institution list column definitions (reused by the DataTable). Pure presentation — sort fields
 * map to the backend ordering allow-list (institutions.types.ts): `name_en`, `display_order`,
 * `published_at`, `created_at`. The Actions column is rendered by the list page so it can wire
 * navigation. Columns surface exactly the contract: name, type, district, homepage, state, updated.
 */
export function institutionColumns(actions?: (row: InstitutionSummary) => React.ReactNode): ColumnDef<InstitutionSummary>[] {
  const cols: ColumnDef<InstitutionSummary>[] = [
    {
      id: 'name',
      header: 'Institution',
      sortField: 'name_en',
      cell: (i) => (
        <div className="flex min-w-0 items-center gap-2.5">
          {i.logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={i.logo.url} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <Link
              href={`${ROUTES.institutions}/${i.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {i.name_en}
            </Link>
            {i.name_hi ? <p className="truncate text-xs text-muted-foreground">{i.name_hi}</p> : null}
          </div>
        </div>
      ),
    },
    { id: 'institution_type', header: 'Type', cell: (i) => <span className="text-muted-foreground">{i.institution_type.name_en}</span> },
    { id: 'district', header: 'District', cell: (i) => <span className="text-muted-foreground">{i.district?.name_en ?? '—'}</span> },
    { id: 'publication_state', header: 'State', cell: (i) => <StatusBadge state={i.publication_state} /> },
    {
      id: 'highlight',
      header: 'Highlight',
      align: 'center',
      defaultHidden: true,
      cell: (i) =>
        i.highlight_type ? <HighlightBadge highlight={i.highlight_type} /> : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      cell: (i) =>
        i.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'display_order',
      header: 'Order',
      align: 'center',
      sortField: 'display_order',
      defaultHidden: true,
      cell: (i) => <span className="text-muted-foreground">{i.display_order ?? '—'}</span>,
    },
    {
      id: 'updated_at',
      header: 'Updated',
      sortField: 'created_at',
      cell: (i) => (
        <span className="text-muted-foreground" title={i.updated_at}>
          {formatRelative(i.updated_at)}
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
      cell: (i) => actions(i),
    });
  }
  return cols;
}
