import { FileText } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { Badge } from '@/components/ui/badge';
import { formatFileSize } from '@/utils/format';
import { formatDate } from '@/utils/date';
import { isImage, type MediaAsset } from '../types';

/**
 * Media list (table) column definitions. Media is not server-sortable (media list has no
 * `ordering` param — always newest first), so no `sortField` is set. Thumbnail, filename, type,
 * size, dimensions, and created date — the contract surface for the list view.
 */
export function mediaColumns(actions?: (row: MediaAsset) => React.ReactNode): ColumnDef<MediaAsset>[] {
  const cols: ColumnDef<MediaAsset>[] = [
    {
      id: 'thumbnail',
      header: <span className="sr-only">Thumbnail</span>,
      width: '4rem',
      cell: (m) => (
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-muted">
          {isImage(m) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.url} alt={m.alt_text ?? m.file_name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      ),
    },
    {
      id: 'file_name',
      header: 'File',
      cell: (m) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{m.title ?? m.file_name}</p>
          {m.title ? <p className="truncate text-xs text-muted-foreground">{m.file_name}</p> : null}
        </div>
      ),
    },
    { id: 'mime_type', header: 'Type', cell: (m) => <span className="text-muted-foreground">{m.mime_type}</span> },
    {
      id: 'dimensions',
      header: 'Dimensions',
      cell: (m) => (m.width && m.height ? `${m.width}×${m.height}` : <span className="text-muted-foreground">—</span>),
    },
    { id: 'file_size', header: 'Size', align: 'right', cell: (m) => formatFileSize(m.file_size) },
    {
      id: 'status',
      header: 'Status',
      align: 'center',
      cell: (m) => (m.archived_at ? <Badge tone="danger">Archived</Badge> : <Badge tone="success" dot>Active</Badge>),
    },
    { id: 'created_at', header: 'Added', cell: (m) => formatDate(m.created_at) },
  ];

  if (actions) {
    cols.push({
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      isActionColumn: true,
      align: 'right',
      cell: (m) => actions(m),
    });
  }
  return cols;
}
