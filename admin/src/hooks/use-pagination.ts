'use client';

import { useCallback, useMemo, useState } from 'react';
import { PAGE_SIZE_DEFAULT } from '@/constants/app';
import { clampPageSize } from '@/utils/pagination';

export interface UsePaginationApi {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
}

/**
 * Local pagination state (page + page_size) for tables that don't sync to the URL.
 * For URL-synced lists, drive these from `useQueryParams` instead.
 */
export function usePagination(initialPageSize = PAGE_SIZE_DEFAULT): UsePaginationApi {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(clampPageSize(initialPageSize));

  const setPage = useCallback((p: number) => setPageState(Math.max(1, p)), []);
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(clampPageSize(size));
    setPageState(1);
  }, []);
  const next = useCallback(() => setPageState((p) => p + 1), []);
  const prev = useCallback(() => setPageState((p) => Math.max(1, p - 1)), []);
  const reset = useCallback(() => setPageState(1), []);

  return useMemo(
    () => ({ page, pageSize, setPage, setPageSize, next, prev, reset }),
    [page, pageSize, setPage, setPageSize, next, prev, reset],
  );
}
