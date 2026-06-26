import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

const { getListMock } = vi.hoisted(() => ({ getListMock: vi.fn() }));

vi.mock('@/lib/api/http', () => ({ getList: getListMock }));

import { useRelationSearch, relationLabel, RELATION_PAGE_SIZE } from './relation-search';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

const page = (items: unknown[], p = 1, totalPages = 1) => ({
  items,
  pagination: { page: p, page_size: RELATION_PAGE_SIZE, total_items: items.length, total_pages: totalPages },
});

describe('useRelationSearch', () => {
  beforeEach(() => getListMock.mockReset());

  it('requests a paginated page server-side (never PAGE_SIZE_MAX) and excludes archived via published scope', async () => {
    getListMock.mockResolvedValue(page([{ id: '1', slug: 'a', title_en: 'Alpha' }]));

    const { result } = renderHook(() => useRelationSearch('programmes', { search: 'al' }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getListMock).toHaveBeenCalledWith('/admin/programmes', {
      page: 1,
      page_size: RELATION_PAGE_SIZE,
      publication_state: 'published', // archived filtering performed SERVER-SIDE
      search: 'al',
    });
    expect(RELATION_PAGE_SIZE).toBeLessThan(100); // not PAGE_SIZE_MAX
  });

  it('omits search when empty and supports a custom publication scope of "all"', async () => {
    getListMock.mockResolvedValue(page([]));

    renderHook(() => useRelationSearch('institutions', { publicationState: 'all' }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(getListMock).toHaveBeenCalled());
    expect(getListMock).toHaveBeenCalledWith('/admin/institutions', {
      page: 1,
      page_size: RELATION_PAGE_SIZE,
    });
  });

  it('derives hasNextPage from the envelope and fetches the next page on demand', async () => {
    getListMock
      .mockResolvedValueOnce(page([{ id: '1', slug: 'a' }], 1, 2))
      .mockResolvedValueOnce(page([{ id: '2', slug: 'b' }], 2, 2));

    const { result } = renderHook(() => useRelationSearch('galleries'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(getListMock).toHaveBeenLastCalledWith('/admin/galleries', expect.objectContaining({ page: 2 }));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('does not fetch while disabled (picker closed)', () => {
    renderHook(() => useRelationSearch('documents', { enabled: false }), { wrapper: wrapper() });
    expect(getListMock).not.toHaveBeenCalled();
  });
});

describe('relationLabel', () => {
  it('prefers title_en, then name_en, then slug', () => {
    expect(relationLabel({ id: '1', slug: 's', title_en: 'T', name_en: 'N' })).toBe('T');
    expect(relationLabel({ id: '1', slug: 's', name_en: 'N' })).toBe('N');
    expect(relationLabel({ id: '1', slug: 's' })).toBe('s');
  });
});
