import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { searchMock } = vi.hoisted(() => ({ searchMock: vi.fn() }));

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return { ...actual, searchAdmin: searchMock };
});

import { useSearchResults } from './hooks';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useSearchResults', () => {
  beforeEach(() => searchMock.mockReset());

  it('does not call the backend below the minimum query length', () => {
    renderHook(() => useSearchResults({ q: 'a' }), { wrapper: makeWrapper() });
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('runs a server-side search once the query is long enough', async () => {
    searchMock.mockResolvedValue({
      items: [],
      pagination: { page: 1, page_size: 20, total_items: 0, total_pages: 0 },
    });

    const { result } = renderHook(() => useSearchResults({ q: 'lac', page_size: 20 }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchMock).toHaveBeenCalledWith({ q: 'lac', page_size: 20 });
  });
});
