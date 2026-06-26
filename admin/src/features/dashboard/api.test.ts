import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getListMock, getMock } = vi.hoisted(() => ({ getListMock: vi.fn(), getMock: vi.fn() }));

vi.mock('@/lib/api/http', () => ({
  get: getMock,
  getList: getListMock,
}));

import { fetchContentCount } from './api';
import { adminResource } from '@/constants/api-endpoints';

describe('fetchContentCount', () => {
  beforeEach(() => {
    getListMock.mockReset();
  });

  it('returns the backend-computed total_items (never a client tally)', async () => {
    getListMock.mockResolvedValue({
      items: [{ id: '1' }],
      pagination: { page: 1, page_size: 1, total_items: 137, total_pages: 137 },
    });

    const count = await fetchContentCount('events', { publication_state: 'draft' });

    expect(count).toBe(137);
    // Requests a single light row from the resource list, forwarding the filter.
    expect(getListMock).toHaveBeenCalledWith(adminResource('events').list, {
      page: 1,
      page_size: 1,
      publication_state: 'draft',
    });
  });
});
