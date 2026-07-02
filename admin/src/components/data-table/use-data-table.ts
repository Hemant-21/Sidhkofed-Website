'use client';

/**
 * Controller hook for the DataTable: holds page/pageSize/sort/selection/hidden
 * columns and derives the backend `ordering` string from the sort state. Module
 * list pages use this + a React Query call + <DataTable> + <Pagination> to get a
 * full list view with almost no boilerplate.
 */

import { useCallback, useMemo, useState } from 'react';
import { PAGE_SIZE_DEFAULT } from '@/constants/app';
import type { SortState } from '@/types/table';

export interface UseDataTableOptions {
  initialPageSize?: number;
  initialSort?: SortState | null;
}

export function useDataTable(options: UseDataTableOptions = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options.initialPageSize ?? PAGE_SIZE_DEFAULT);
  const [sort, setSort] = useState<SortState | null>(options.initialSort ?? null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  const onSortChange = useCallback((next: SortState | null) => {
    setSort(next);
    setPage(1);
  }, []);

  const clearSelection = useCallback(() => setSelectedRowIds([]), []);

  /** Backend `ordering` value: `field` (asc) or `-field` (desc); undefined = default. */
  const ordering = useMemo(() => {
    if (!sort) return undefined;
    return sort.direction === 'desc' ? `-${sort.field}` : sort.field;
  }, [sort]);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    sort,
    onSortChange,
    ordering,
    selectedRowIds,
    setSelectedRowIds,
    clearSelection,
    hiddenColumns,
    setHiddenColumns,
  };
}

export type DataTableController = ReturnType<typeof useDataTable>;
