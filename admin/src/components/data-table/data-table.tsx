'use client';

/**
 * Generic, server-driven DataTable. Reusable by every module's list page — it owns
 * NO data-fetching or module fields. Supports: server sorting (maps to `ordering`),
 * bulk row selection, an action column, column visibility, and loading/empty/error
 * states. Responsive via horizontal scroll. Pagination is rendered by the caller
 * using the <Pagination> component with the same server pagination block.
 */

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { ColumnDef, SortState, TableDataState } from '@/types/table';
import { cn } from '@/utils/cn';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/feedback/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';

export interface DataTableProps<TRow> {
  columns: ColumnDef<TRow>[];
  data: TableDataState<TRow>;
  getRowId: (row: TRow) => string;
  /** Current sort + change handler (controlled). Enables header sort affordances. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  /** Bulk selection (controlled). */
  selectable?: boolean;
  selectedRowIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Hidden column ids (controlled by ColumnVisibility). */
  hiddenColumns?: string[];
  /** Row click handler (e.g. navigate to detail). */
  onRowClick?: (row: TRow) => void;
  emptyState?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}

const ALIGN: Record<NonNullable<ColumnDef<unknown>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function DataTable<TRow>({
  columns,
  data,
  getRowId,
  sort,
  onSortChange,
  selectable = false,
  selectedRowIds = [],
  onSelectionChange,
  hiddenColumns = [],
  onRowClick,
  emptyState,
  onRetry,
  className,
}: DataTableProps<TRow>) {
  const visibleColumns = columns.filter((c) => !hiddenColumns.includes(c.id));
  const { rows, isLoading, isError, error } = data;

  const allSelected = rows.length > 0 && rows.every((r) => selectedRowIds.includes(getRowId(r)));
  const someSelected = rows.some((r) => selectedRowIds.includes(getRowId(r)));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      const pageIds = new Set(rows.map(getRowId));
      onSelectionChange(selectedRowIds.filter((id) => !pageIds.has(id)));
    } else {
      const merged = new Set([...selectedRowIds, ...rows.map(getRowId)]);
      onSelectionChange(Array.from(merged));
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedRowIds.includes(id) ? selectedRowIds.filter((x) => x !== id) : [...selectedRowIds, id],
    );
  };

  const handleSort = (field?: string) => {
    if (!field || !onSortChange) return;
    if (sort?.field === field) {
      onSortChange(sort.direction === 'asc' ? { field, direction: 'desc' } : null);
    } else {
      onSortChange({ field, direction: 'asc' });
    }
  };

  // Error state replaces the whole table body region.
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} className={className} />;
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border">
              {selectable ? (
                <th scope="col" className="w-10 px-3 py-2.5">
                  <Checkbox
                    aria-label="Select all rows on this page"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected;
                    }}
                    onChange={toggleAll}
                  />
                </th>
              ) : null}
              {visibleColumns.map((col) => {
                const sortable = Boolean(col.sortField) && Boolean(onSortChange);
                const active = sort?.field === col.sortField;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    aria-sort={
                      active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'px-3 py-2.5 font-medium text-muted-foreground',
                      ALIGN[col.align ?? 'left'],
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.sortField)}
                        className="inline-flex items-center gap-1 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      >
                        {col.header}
                        {active ? (
                          sort?.direction === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRows columns={visibleColumns.length + (selectable ? 1 : 0)} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="p-0">
                  <div className="p-6">{emptyState ?? <EmptyState />}</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = getRowId(row);
                const selected = selectedRowIds.includes(id);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-border last:border-0 transition-colors',
                      onRowClick && 'cursor-pointer',
                      selected ? 'bg-primary/5' : 'hover:bg-muted/40',
                    )}
                  >
                    {selectable ? (
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label="Select row"
                          checked={selected}
                          onChange={() => toggleRow(id)}
                        />
                      </td>
                    ) : null}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.id}
                        className={cn('px-3 py-2.5 text-foreground', ALIGN[col.align ?? 'left'])}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, r) => (
        <tr key={r} className="border-b border-border last:border-0">
          {Array.from({ length: columns }).map((__, c) => (
            <td key={c} className="px-3 py-3">
              <Skeleton className="h-4 w-full max-w-[8rem]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
