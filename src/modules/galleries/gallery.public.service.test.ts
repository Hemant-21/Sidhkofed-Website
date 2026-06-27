/**
 * Unit tests — gallery PUBLIC reads (Phase 17.2 API contract remediation, Finding 2).
 * Proves: the visibility predicate is delegated to the repository, the public DTO never leaks
 * internal/audit fields, cache miss → repo + setJson, and a missing slug → 404.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GalleryRow, GallerySummaryRow } from './gallery.repository';

const { repo, media, usage, audit, cache } = vi.hoisted(() => ({
  repo: {
    slugExists: vi.fn(), create: vi.fn(), findById: vi.fn(), list: vi.fn(), publicList: vi.fn(),
    findPublicBySlug: vi.fn(), update: vi.fn(), transaction: vi.fn(), addImage: vi.fn(),
    findImage: vi.fn(), updateImage: vi.fn(), deleteImage: vi.fn(), nextImageOrder: vi.fn(),
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
import { NotFoundError } from '@/shared/errors';

function summaryRow(over: Partial<GallerySummaryRow> = {}): GallerySummaryRow {
  const now = new Date();
  return {
    id: 'g1', slug: 'photos', titleEn: 'Photos', titleHi: null, descriptionEn: 'D', descriptionHi: null,
    coverMediaId: null, publicationState: 'published', publicVisibility: true, publishStartAt: null,
    publishedAt: now, archivedAt: null, highlightType: null, highlightStartAt: null, highlightEndAt: null,
    displayOrder: 2, showOnHomepage: true, createdById: 'u1', updatedById: 'u1', createdAt: now, updatedAt: now,
    coverMedia: null, _count: { images: 4 }, ...over,
  } as GallerySummaryRow;
}

function detailRow(over: Partial<GalleryRow> = {}): GalleryRow {
  const now = new Date();
  return {
    id: 'g1', slug: 'photos', titleEn: 'Photos', titleHi: null, descriptionEn: 'D', descriptionHi: null,
    coverMediaId: null, publicationState: 'published', publicVisibility: true, publishStartAt: null,
    publishedAt: now, archivedAt: null, highlightType: null, highlightStartAt: null, highlightEndAt: null,
    displayOrder: 2, showOnHomepage: true, createdById: 'u1', updatedById: 'u1', createdAt: now, updatedAt: now,
    coverMedia: null, images: [], ...over,
  } as GalleryRow;
}

beforeEach(() => {
  vi.clearAllMocks();
  cache.getJson.mockResolvedValue(null); // cache miss by default
});

describe('gallery public reads', () => {
  it('publicList maps the lean public DTO and never leaks internal/audit fields', async () => {
    repo.publicList.mockResolvedValue({ rows: [summaryRow()], total: 1 });
    const result = await galleryService.publicList(
      { showOnHomepage: true },
      { field: 'display_order', direction: 'asc' },
      { skip: 0, take: 20 },
      'galleries:public:list:test',
    );
    expect(result.total).toBe(1);
    const item = result.items[0] as Record<string, unknown>;
    expect(item).toMatchObject({ id: 'g1', slug: 'photos', image_count: 4, public_url: '/galleries/photos' });
    // Internal / audit / workflow fields must NOT be present on the public shape.
    for (const k of ['publication_state', 'public_visibility', 'archived_at', 'created_at', 'updated_at', 'show_on_homepage']) {
      expect(item).not.toHaveProperty(k);
    }
    expect(cache.setJson).toHaveBeenCalledOnce();
  });

  it('publicList serves a cache hit without touching the repository', async () => {
    cache.getJson.mockResolvedValue({ items: [], total: 0 });
    await galleryService.publicList({}, { field: 'display_order', direction: 'asc' }, { skip: 0, take: 20 }, 'k');
    expect(repo.publicList).not.toHaveBeenCalled();
  });

  it('publicDetailBySlug returns the detail DTO with images', async () => {
    repo.findPublicBySlug.mockResolvedValue(detailRow());
    const dto = await galleryService.publicDetailBySlug('photos');
    expect(dto).toMatchObject({ slug: 'photos', public_url: '/galleries/photos', images: [] });
    expect(dto).not.toHaveProperty('publication_state');
  });

  it('publicDetailBySlug throws 404 when the slug is not publicly visible', async () => {
    repo.findPublicBySlug.mockResolvedValue(null);
    await expect(galleryService.publicDetailBySlug('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
