/**
 * Unit tests — leadership service: photo linkability (image, not archived), media-usage tracking on
 * create, and the Content-Editor edit restriction. Repository + cross-module services are mocked
 * (DB-free). The repository `transaction` runs its callback inline against a stub tx client.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ResolvedAuthorization } from '@/modules/auth/auth.types';

const { repo, cache, audit, media, usage } = vi.hoisted(() => ({
  repo: {
    slugExists: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
  media: { getById: vi.fn() },
  usage: { registerUsage: vi.fn(), removeUsage: vi.fn() },
}));

vi.mock('./leadership.repository', () => ({ leadershipRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/modules/media/media.service', () => ({ mediaService: media }));
vi.mock('@/modules/media/media-usage.service', () => ({ mediaUsageService: usage }));
vi.mock('@/modules/media/media.validation', () => ({
  MEDIA_TYPE_REGISTRY: { 'image/png': { category: 'image' }, 'application/pdf': { category: 'document' } },
}));

import { leadershipService } from './leadership.service';
import { PermissionError, ValidationError } from '@/shared/errors';

const NOW = new Date('2026-06-25T00:00:00.000Z');
const PHOTO = '44444444-4444-4444-8444-444444444444';

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'l-1',
    slug: 'hemant-soren',
    nameEn: 'Shri Hemant Soren',
    nameHi: null,
    govtRoleEn: "Hon'ble Chief Minister, Jharkhand",
    govtRoleHi: null,
    sidhkofedRoleEn: 'President, SIDHKOFED',
    sidhkofedRoleHi: null,
    photoMediaId: null,
    photoMedia: null,
    publicationState: 'published',
    publicVisibility: true,
    highlightType: null,
    displayOrder: null,
    publishStartAt: null,
    highlightStartAt: null,
    highlightEndAt: null,
    publishedAt: NOW,
    archivedAt: null,
    createdById: 'u-1',
    updatedById: 'u-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const authz = (over: Partial<ResolvedAuthorization>): ResolvedAuthorization =>
  ({ isSuperAdmin: false, roles: [], permissions: [], ...over } as ResolvedAuthorization);
const editor = authz({ permissions: ['content.create', 'content.update'] });
const publisher = authz({ permissions: ['content.update', 'content.publish'] });
const ctx = (a: ResolvedAuthorization) => ({ userId: 'u-1', authz: a });

beforeEach(() => {
  vi.clearAllMocks();
  repo.slugExists.mockResolvedValue(false);
  repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
  repo.update.mockImplementation(async () => makeRow());
  repo.create.mockImplementation(async () => makeRow({ id: 'l-1' }));
  repo.findById.mockResolvedValue(makeRow());
});

describe('leadershipService.create — photo linkability + usage', () => {
  it('rejects an archived photo (422)', async () => {
    media.getById.mockResolvedValue({ archived_at: NOW, mime_type: 'image/png' });
    await expect(
      leadershipService.create(
        {
          name_en: 'Shri Hemant Soren',
          govt_role_en: "Hon'ble Chief Minister, Jharkhand",
          sidhkofed_role_en: 'President, SIDHKOFED',
          photo_media_id: PHOTO,
        } as never,
        ctx(editor),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });
  it('rejects a non-image photo (422)', async () => {
    media.getById.mockResolvedValue({ archived_at: null, mime_type: 'application/pdf' });
    await expect(
      leadershipService.create(
        {
          name_en: 'Shri Hemant Soren',
          govt_role_en: "Hon'ble Chief Minister, Jharkhand",
          sidhkofed_role_en: 'President, SIDHKOFED',
          photo_media_id: PHOTO,
        } as never,
        ctx(editor),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });
  it('registers media usage for a valid image photo', async () => {
    media.getById.mockResolvedValue({ archived_at: null, mime_type: 'image/png' });
    repo.create.mockResolvedValue(makeRow({ id: 'l-1', photoMediaId: PHOTO }));
    await leadershipService.create(
      {
        name_en: 'Shri Hemant Soren',
        govt_role_en: "Hon'ble Chief Minister, Jharkhand",
        sidhkofed_role_en: 'President, SIDHKOFED',
        photo_media_id: PHOTO,
      } as never,
      ctx(editor),
    );
    expect(usage.registerUsage).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: PHOTO, entityType: 'leadership', field: 'photo_media_id' }),
      expect.anything(),
    );
  });
  it('creates an entry with no photo (no media lookup)', async () => {
    await leadershipService.create(
      {
        name_en: 'Shmt. Shilpi Neha Tirkey',
        govt_role_en: "Hon'ble Minister, Agriculture, Animal Husbandry & Cooperative, Jharkhand",
        sidhkofed_role_en: 'Vice-President, SIDHKOFED',
      } as never,
      ctx(editor),
    );
    expect(media.getById).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalled();
  });
});

describe('leadershipService.update — Content Editor restriction', () => {
  it('rejects a Content Editor editing a PUBLISHED entry (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(
      leadershipService.update('l-1', { name_hi: 'x' }, ctx(editor)),
    ).rejects.toBeInstanceOf(PermissionError);
  });
  it('allows a Publisher editing a PUBLISHED entry', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(leadershipService.update('l-1', { name_hi: 'x' }, ctx(publisher))).resolves.toBeDefined();
  });
});
