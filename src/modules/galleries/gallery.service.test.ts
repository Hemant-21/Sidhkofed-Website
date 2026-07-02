/** Unit tests — gallery service: media-usage registration on cover + image add. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GalleryRow } from './gallery.repository';

const { repo, media, usage, audit, cache } = vi.hoisted(() => ({
  repo: {
    slugExists: vi.fn(), create: vi.fn(), findById: vi.fn(), list: vi.fn(), publicList: vi.fn(), findPublicBySlug: vi.fn(), update: vi.fn(),
    transaction: vi.fn(), addImage: vi.fn(), findImage: vi.fn(), updateImage: vi.fn(), deleteImage: vi.fn(), nextImageOrder: vi.fn(),
  },
  media: { getById: vi.fn() },
  usage: { registerUsage: vi.fn(), removeUsage: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
}));

vi.mock('./gallery.repository', () => ({ galleryRepository: repo }));
vi.mock('@/modules/media/media.service', () => ({ mediaService: media }));
vi.mock('@/modules/media/media-usage.service', () => ({ mediaUsageService: usage }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));

import { galleryService } from './gallery.service';
import { ValidationError } from '@/shared/errors';

function makeGallery(over: Partial<GalleryRow> = {}): GalleryRow {
  const now = new Date();
  return {
    id: 'g1', slug: 'demo', titleEn: 'Demo', titleHi: null, descriptionEn: null, descriptionHi: null,
    coverMediaId: null, publicationState: 'draft', publicVisibility: true, publishStartAt: null, publishedAt: null,
    archivedAt: null, highlightType: null, highlightStartAt: null, highlightEndAt: null, displayOrder: null,
    showOnHomepage: false, createdById: 'u1', updatedById: 'u1', createdAt: now, updatedAt: now,
    coverMedia: null, images: [], ...over,
  } as GalleryRow;
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.slugExists.mockResolvedValue(false);
  // Transaction helper executes its callback with a stub tx client (Issue 6).
  repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
});

describe('galleryService.create', () => {
  it('registers media usage for the cover image and audits the create', async () => {
    media.getById.mockResolvedValue({ archived_at: null });
    repo.create.mockResolvedValue(makeGallery({ coverMediaId: 'cover1' }));
    await galleryService.create({ title_en: 'Demo', cover_media_id: 'cover1' }, { userId: 'u1' });
    expect(usage.registerUsage).toHaveBeenCalledWith(expect.objectContaining({ mediaId: 'cover1', entityType: 'gallery', field: 'cover_media_id' }), {});
    expect(audit.create).toHaveBeenCalledWith(expect.anything(), 'gallery', 'g1', expect.anything());
  });

  it('rejects linking an archived cover asset', async () => {
    media.getById.mockResolvedValue({ archived_at: new Date().toISOString() });
    await expect(galleryService.create({ title_en: 'Demo', cover_media_id: 'cover1' }, { userId: 'u1' })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('galleryService.addImage', () => {
  it('links the image and registers usage inside a transaction', async () => {
    repo.findById.mockResolvedValue(makeGallery());
    media.getById.mockResolvedValue({ archived_at: null });
    repo.nextImageOrder.mockResolvedValue(0);
    repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
    await galleryService.addImage('g1', { media_id: 'm1' }, { userId: 'u1' });
    expect(repo.addImage).toHaveBeenCalled();
    expect(usage.registerUsage).toHaveBeenCalledWith(expect.objectContaining({ mediaId: 'm1', entityType: 'gallery', field: 'image' }), {});
  });
});
