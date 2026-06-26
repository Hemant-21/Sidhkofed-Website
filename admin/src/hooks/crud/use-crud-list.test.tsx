import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));

vi.mock('@/lib/api/crud-factory', () => ({
  createResourceApi: () => ({ list: listMock, endpoints: {} }),
}));

import { useCrudList } from './use-crud-list';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useCrudList', () => {
  beforeEach(() => listMock.mockReset());

  it('fetches a page and exposes items + pagination', async () => {
    listMock.mockResolvedValue({
      items: [{ id: '1' }],
      pagination: { page: 1, page_size: 20, total_items: 1, total_pages: 1 },
    });

    const { result } = renderHook(() => useCrudList('events', { page: 1, search: 'lac' }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.pagination.total_items).toBe(1);
    expect(listMock).toHaveBeenCalledWith({ page: 1, search: 'lac' });
  });

  it('does not fetch while disabled', () => {
    renderHook(() => useCrudList('events', undefined, { enabled: false }), {
      wrapper: makeWrapper(),
    });
    expect(listMock).not.toHaveBeenCalled();
  });
});
