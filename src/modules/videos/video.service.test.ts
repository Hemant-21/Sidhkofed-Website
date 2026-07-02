/** Unit tests — video service: YouTube validation + ≤3 homepage cap + lifecycle. */
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
import { ValidationError, ConflictError } from '@/shared/errors';

const ID = 'dQw4w9WgXcQ';
function makeVideo(over: Partial<Video> = {}): Video {
  const now = new Date();
  return {
    id: 'v1', slug: 'demo', titleEn: 'Demo', titleHi: null, descriptionEn: null, descriptionHi: null,
    youtubeId: ID, youtubeUrl: `https://www.youtube.com/watch?v=${ID}`, thumbnailMediaId: null,
    publicationState: 'draft', publicVisibility: true, publishStartAt: null, publishedAt: null, archivedAt: null,
    highlightType: null, highlightStartAt: null, highlightEndAt: null, displayOrder: null, showOnHomepage: false,
    createdById: 'u1', updatedById: 'u1', createdAt: now, updatedAt: now, ...over,
  } as Video;
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.slugExists.mockResolvedValue(false);
  settings.getVideoHomepageLimit.mockResolvedValue(3);
  // Transaction helper executes its callback with a stub tx client (Issue 6).
  repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
});

describe('videoService.create', () => {
  it('accepts a valid YouTube URL and stores the normalized id', async () => {
    repo.create.mockResolvedValue(makeVideo());
    const dto = await videoService.create({ title_en: 'Demo', youtube_url: `https://youtu.be/${ID}` }, { userId: 'u1' });
    expect(dto.youtube_id).toBe(ID);
    expect(repo.create).toHaveBeenCalled();
    expect(audit.create).toHaveBeenCalledWith(expect.anything(), 'video', 'v1', expect.anything());
  });

  it('rejects a non-YouTube URL', async () => {
    await expect(videoService.create({ title_en: 'X', youtube_url: 'https://vimeo.com/1' }, { userId: 'u1' })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('videoService.lifecycle publish — homepage cap', () => {
  it('rejects publishing a 4th featured homepage video', async () => {
    repo.findById.mockResolvedValue(makeVideo({ showOnHomepage: true }));
    repo.countPublicHomepage.mockResolvedValue(3);
    await expect(videoService.lifecycle('v1', 'publish', { userId: 'u1' })).rejects.toBeInstanceOf(ConflictError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('publishes when under the cap and sets published_at', async () => {
    repo.findById.mockResolvedValue(makeVideo({ showOnHomepage: true }));
    repo.countPublicHomepage.mockResolvedValue(1);
    repo.update.mockResolvedValue(makeVideo({ showOnHomepage: true, publicationState: 'published', publishedAt: new Date() }));
    const dto = await videoService.lifecycle('v1', 'publish', { userId: 'u1' });
    expect(dto.publication_state).toBe('published');
    expect(audit.log).toHaveBeenCalledWith('PUBLISH', expect.anything(), expect.objectContaining({ module: 'video' }));
  });
});
