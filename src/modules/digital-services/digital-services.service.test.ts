/**
 * Unit tests — digital-service service: icon linkability (image, not archived), media-usage tracking
 * on create, and the Content-Editor edit restriction. Repository + cross-module services are mocked
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

vi.mock('./digital-services.repository', () => ({ digitalServiceRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/modules/media/media.service', () => ({ mediaService: media }));
vi.mock('@/modules/media/media-usage.service', () => ({ mediaUsageService: usage }));
vi.mock('@/modules/media/media.validation', () => ({
  MEDIA_TYPE_REGISTRY: { 'image/png': { category: 'image' }, 'application/pdf': { category: 'document' } },
}));

import { digitalServiceService } from './digital-services.service';
import { PermissionError, ValidationError } from '@/shared/errors';

const NOW = new Date('2026-06-25T00:00:00.000Z');
const ICON = '44444444-4444-4444-8444-444444444444';

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'd-1',
    slug: 'erp',
    titleEn: 'ERP',
    titleHi: null,
    descriptionEn: null,
    descriptionHi: null,
    externalUrl: 'https://erp.example',
    iconMediaId: null,
    iconMedia: null,
    publicationState: 'published',
    publicVisibility: true,
    showOnHomepage: false,
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
  repo.create.mockImplementation(async () => makeRow({ id: 'd-1' }));
  repo.findById.mockResolvedValue(makeRow());
});

describe('digitalServiceService.create — icon linkability + usage', () => {
  it('rejects an archived icon (422)', async () => {
    media.getById.mockResolvedValue({ archived_at: NOW, mime_type: 'image/png' });
    await expect(
      digitalServiceService.create({ title_en: 'ERP', external_url: 'https://erp.example', icon_media_id: ICON } as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });
  it('rejects a non-image icon (422)', async () => {
    media.getById.mockResolvedValue({ archived_at: null, mime_type: 'application/pdf' });
    await expect(
      digitalServiceService.create({ title_en: 'ERP', external_url: 'https://erp.example', icon_media_id: ICON } as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ValidationError);
  });
  it('registers media usage for a valid image icon', async () => {
    media.getById.mockResolvedValue({ archived_at: null, mime_type: 'image/png' });
    repo.create.mockResolvedValue(makeRow({ id: 'd-1', iconMediaId: ICON }));
    await digitalServiceService.create(
      { title_en: 'ERP', external_url: 'https://erp.example', icon_media_id: ICON } as never,
      ctx(editor),
    );
    expect(usage.registerUsage).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: ICON, entityType: 'digital_service', field: 'icon_media_id' }),
      expect.anything(),
    );
  });
  it('creates a service with no icon (no media lookup)', async () => {
    await digitalServiceService.create({ title_en: 'MIS', external_url: 'https://mis.example' } as never, ctx(editor));
    expect(media.getById).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalled();
  });
});

describe('digitalServiceService.update — Content Editor restriction', () => {
  it('rejects a Content Editor editing a PUBLISHED service (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(
      digitalServiceService.update('d-1', { title_hi: 'x' }, ctx(editor)),
    ).rejects.toBeInstanceOf(PermissionError);
  });
  it('allows a Publisher editing a PUBLISHED service', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(digitalServiceService.update('d-1', { title_hi: 'x' }, ctx(publisher))).resolves.toBeDefined();
  });
});
