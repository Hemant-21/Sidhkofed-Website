import Link from 'next/link';
import { Home, Library } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { formatDate, formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import type { DocumentSummary } from '../types';

/**
 * Document list column definitions (reused by the DataTable). Pure presentation — sort fields map
 * to the backend ordering allow-list (documents.types.ts): `title_en`, `publication_date`,
 * `display_order`, `created_at`. The Actions column is rendered by the list page so it can wire
 * navigation. Columns surface exactly the contract: title, type, knowledge category, language,
 * state, highlight, homepage, updated.
 */
export function documentColumns(actions?: (row: DocumentSummary) => React.ReactNode): ColumnDef<DocumentSummary>[] {
  const cols: ColumnDef<DocumentSummary>[] = [
    {
      id: 'title',
      header: 'Title',
      sortField: 'title_en',
      cell: (d) => (
        <div className="min-w-0">
          <Link
            href={`${ROUTES.documents}/${d.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {d.title_en}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{d.file.file_name}</p>
        </div>
      ),
    },
    { id: 'document_type', header: 'Type', cell: (d) => <span className="text-muted-foreground">{d.document_type.name_en}</span> },
    {
      id: 'knowledge_category',
      header: 'Knowledge category',
      cell: (d) =>
        d.show_in_knowledge_centre && d.knowledge_category ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Library className="h-3.5 w-3.5" aria-hidden="true" /> {d.knowledge_category.name_en}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { id: 'language', header: 'Lang', align: 'center', cell: (d) => <span className="uppercase text-muted-foreground">{d.language}</span> },
    {
      id: 'publication_date',
      header: 'Published on',
      sortField: 'publication_date',
      cell: (d) => formatDate(d.publication_date),
    },
    { id: 'publication_state', header: 'State', cell: (d) => <StatusBadge state={d.publication_state} /> },
    {
      id: 'highlight',
      header: 'Highlight',
      align: 'center',
      defaultHidden: true,
      cell: (d) =>
        d.highlight_type ? <HighlightBadge highlight={d.highlight_type} /> : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      defaultHidden: true,
      cell: (d) =>
        d.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
      id: 'updated_at',
      header: 'Updated',
      sortField: 'created_at',
      cell: (d) => (
        <span className="text-muted-foreground" title={d.updated_at}>
          {formatRelative(d.updated_at)}
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
      cell: (d) => actions(d),
    });
  }
  return cols;
}
