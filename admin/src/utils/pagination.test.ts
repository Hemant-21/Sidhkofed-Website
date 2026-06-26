import { describe, expect, it } from 'vitest';
import { clampPageSize, pageRange, paginationRange, totalPages } from './pagination';

describe('pagination math', () => {
  it('clamps page size to [1, 100]', () => {
    expect(clampPageSize(undefined)).toBe(20);
    expect(clampPageSize(0)).toBe(20);
    expect(clampPageSize(50)).toBe(50);
    expect(clampPageSize(500)).toBe(100);
  });

  it('computes total pages (min 1)', () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(137, 20)).toBe(7);
  });

  it('computes the displayed range', () => {
    expect(pageRange(1, 20, 137)).toEqual([1, 20]);
    expect(pageRange(7, 20, 137)).toEqual([121, 137]);
    expect(pageRange(1, 20, 0)).toEqual([0, 0]);
  });

  it('builds a compact page sequence with ellipses', () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    const r = paginationRange(10, 20);
    expect(r[0]).toBe(1);
    expect(r[r.length - 1]).toBe(20);
    expect(r).toContain('ellipsis');
    expect(r).toContain(10);
  });
});
