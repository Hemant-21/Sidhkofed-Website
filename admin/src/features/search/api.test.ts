import { describe, expect, it } from 'vitest';
import { buildSearchQuery } from './api';

describe('buildSearchQuery', () => {
  it('forwards only the backend allow-listed keys and drops empties', () => {
    const query = buildSearchQuery({
      q: 'lac',
      content_type: 'event,document',
      year: '2026',
      commodity: undefined,
      district: '',
      programme: undefined,
      page: 2,
      page_size: 20,
    });

    expect(query).toEqual({
      q: 'lac',
      content_type: 'event,document',
      year: '2026',
      page: 2,
      page_size: 20,
    });
    // Empty/undefined optional filters are not sent (the backend rejects unknown/empty).
    expect('district' in query).toBe(false);
    expect('commodity' in query).toBe(false);
  });

  it('keeps a bare query with no filters', () => {
    expect(buildSearchQuery({ q: 'honey' })).toEqual({ q: 'honey' });
  });
});
