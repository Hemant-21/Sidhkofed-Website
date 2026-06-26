/**
 * Pagination math helpers (pure). Reused by the Pagination component and tables.
 */

import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from '@/constants/app';

export function clampPageSize(size: number | undefined): number {
  if (!size || size < 1) return PAGE_SIZE_DEFAULT;
  return Math.min(size, PAGE_SIZE_MAX);
}

export function totalPages(totalItems: number, pageSize: number): number {
  const size = clampPageSize(pageSize);
  return Math.max(1, Math.ceil(totalItems / size));
}

/** Range descriptor: "Showing 21–40 of 137". Returns [from, to]. */
export function pageRange(page: number, pageSize: number, totalItems: number): [number, number] {
  if (totalItems === 0) return [0, 0];
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  return [from, to];
}

/**
 * Build a compact page-number sequence with ellipses, e.g.
 * `[1, '…', 4, 5, 6, '…', 20]`. `siblings` controls neighbours around current.
 */
export function paginationRange(
  current: number,
  total: number,
  siblings = 1,
): Array<number | 'ellipsis'> {
  const totalNumbers = siblings * 2 + 5; // first, last, current, 2 ellipses
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < total - 1;
  const result: Array<number | 'ellipsis'> = [1];
  if (showLeftEllipsis) result.push('ellipsis');
  for (let i = left; i <= right; i++) {
    if (i !== 1 && i !== total) result.push(i);
  }
  if (showRightEllipsis) result.push('ellipsis');
  result.push(total);
  return result;
}
