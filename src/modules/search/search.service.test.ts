/**
 * Unit tests — search service (Phase 13). Mocks the repository to verify public-vs-admin visibility,
 * batched cover-media resolution (no N+1), DTO mapping, and the empty-result fast path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MediaRef } from '@/modules/institutions/institutions.dto';
import type { SearchRow } from './search.repository';

const { repo } = vi.hoisted(() => ({
  repo: { search: vi.fn(), findCoverMediaRefs: vi.fn(), buildSurfaceFragments: vi.fn(), tsQuery: vi.fn() },
}));
vi.mock('./search.repository', () => ({ searchRepository: repo }));

import { searchService } from './search.service';

const FILTERS = { q: 'lac', contentTypes: ['event'] as const };

beforeEach(() => {
  vi.clearAllMocks();
  repo.findCoverMediaRefs.mockResolvedValue(new Map());
});

describe('searchService.publicSearch', () => {
  it('queries with the public predicate and maps rows to lightweight DTOs', async () => {
    const rows: SearchRow[] = [
      { content_type: 'event', id: 'e1', slug: 'lac-training', title_en: 'Lac', title_hi: null, summary: 's', publication_date: '2026-02-10', cover_media_id: null, rank: 0.6 },
    ];
    repo.search.mockResolvedValue({ rows, total: 1 });

    const res = await searchService.publicSearch({ ...FILTERS, contentTypes: ['event'] }, { skip: 0, take: 20 });

    expect(repo.search).toHaveBeenCalledWith(expect.objectContaining({ q: 'lac' }), { skip: 0, take: 20, public: true });
    expect(res.total).toBe(1);
    expect(res.items[0]).toMatchObject({ content_type: 'event', public_url: '/events/lac-training', cover_media: null });
  });

  it('resolves cover media in a single batch for the unique non-null ids', async () => {
    const ref: MediaRef = { id: 'm1', url: '/c.jpg', file_name: 'c.jpg', mime_type: 'image/jpeg', title: null, alt_text: null, caption: null, width: null, height: null };
    repo.search.mockResolvedValue({
      rows: [
        { content_type: 'event', id: 'e1', slug: 'a', title_en: 'A', title_hi: null, summary: null, publication_date: null, cover_media_id: 'm1', rank: 0.5 },
        { content_type: 'news', id: 'n1', slug: 'b', title_en: 'B', title_hi: null, summary: null, publication_date: null, cover_media_id: 'm1', rank: 0.4 },
        { content_type: 'document', id: 'd1', slug: 'c', title_en: 'C', title_hi: null, summary: null, publication_date: null, cover_media_id: null, rank: 0.3 },
      ],
      total: 3,
    });
    repo.findCoverMediaRefs.mockResolvedValue(new Map([['m1', ref]]));

    const res = await searchService.publicSearch(FILTERS, { skip: 0, take: 20 });

    expect(repo.findCoverMediaRefs).toHaveBeenCalledTimes(1);
    expect(repo.findCoverMediaRefs).toHaveBeenCalledWith(['m1']); // unique, non-null
    expect(res.items[0]!.cover_media).toBe(ref);
    expect(res.items[2]!.cover_media).toBeNull();
  });

  it('skips media resolution when there are no rows', async () => {
    repo.search.mockResolvedValue({ rows: [], total: 0 });
    const res = await searchService.publicSearch(FILTERS, { skip: 0, take: 20 });
    expect(res).toEqual({ items: [], total: 0 });
    expect(repo.findCoverMediaRefs).not.toHaveBeenCalled();
  });
});

describe('searchService.adminSearch', () => {
  it('queries across all publication states (public=false)', async () => {
    repo.search.mockResolvedValue({ rows: [], total: 0 });
    await searchService.adminSearch(FILTERS, { skip: 0, take: 20 });
    expect(repo.search).toHaveBeenCalledWith(expect.objectContaining({ q: 'lac' }), { skip: 0, take: 20, public: false });
  });
});
