/**
 * Unit tests — video PUBLIC reads (Phase 17.2 API contract remediation, Finding 3).
 * Proves: the visibility predicate is delegated to the repository, the public DTO exposes only the
 * YouTube reference (never a hosted file or internal/audit fields), and a missing slug → 404.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Video } from '@prisma/client';

const { repo, audit, settings, media, usage, cache } = vi.hoisted(() => ({
  repo: { slugExists: vi.fn(), create: vi.fn(), findById: vi.fn(), update: vi.fn(), countPublicHomepage: vi.fn(), list: vi.fn(), publicList: vi.fn(), findPublicBySlug: vi.fn(), transaction: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
  settings: { getVideoHomepageLimit: vi.fn() },
  media: { getById: vi.fn() },
  usage: { registerUsage: vi.fn(), removeUsage: vi.fn() },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
}));

vi.mock('./video.repository', () => ({ videoRepository: repo }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/modules/settings/settings.service', () => ({ settingsService: settings }));
vi.mock('@/modules/media/media.service', () => ({ mediaService: media }));
vi.mock('@/modules/media/media-usage.service', () => ({ mediaUsageService: usage }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));

import { videoService } from './video.service';
import { NotFoundError } from '@/shared/errors';

function videoRow(over: Partial<Video> = {}): Video {
  const now = new Date();
  return {
    id: 'v1', slug: 'intro', titleEn: 'Intro', titleHi: null, descriptionEn: null, descriptionHi: null,
    youtubeId: 'abcdefghijk', youtubeUrl: 'https://www.youtube.com/watch?v=abcdefghijk', thumbnailMediaId: null,
    publicationState: 'published', publicVisibility: true, publishStartAt: null, publishedAt: now, archivedAt: null,
    highlightType: null, highlightStartAt: null, highlightEndAt: null, displayOrder: 1, showOnHomepage: true,
    createdById: 'u1', updatedById: 'u1', createdAt: now, updatedAt: now, ...over,
  } as Video;
}

beforeEach(() => {
  vi.clearAllMocks();
  cache.getJson.mockResolvedValue(null);
});

describe('video public reads', () => {
  it('publicList maps the YouTube-only public DTO and hides internal/audit fields', async () => {
    repo.publicList.mockResolvedValue({ rows: [videoRow()], total: 1 });
    const result = await videoService.publicList(
      { showOnHomepage: true },
      { field: 'display_order', direction: 'asc' },
      { skip: 0, take: 3 },
      'videos:public:list:test',
    );
    const item = result.items[0] as Record<string, unknown>;
    expect(item).toMatchObject({
      id: 'v1', slug: 'intro', youtube_id: 'abcdefghijk',
      thumbnail_url: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg', public_url: '/videos/intro',
    });
    for (const k of ['publication_state', 'public_visibility', 'archived_at', 'thumbnail_media_id', 'show_on_homepage']) {
      expect(item).not.toHaveProperty(k);
    }
  });

  it('publicDetailBySlug throws 404 when not publicly visible', async () => {
    repo.findPublicBySlug.mockResolvedValue(null);
    await expect(videoService.publicDetailBySlug('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
