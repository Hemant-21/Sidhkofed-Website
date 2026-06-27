'use client';

/** URL-synced wrapper around the accessible <Pagination> control for listings. */

import { Pagination } from '@/components/ui/pagination';
import { useQueryParams } from '@/hooks/use-query-params';

export function PaginationNav({ page, totalPages }: { page: number; totalPages: number }) {
  const { setParams } = useQueryParams();
  return <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setParams({ page: p })} />;
}
