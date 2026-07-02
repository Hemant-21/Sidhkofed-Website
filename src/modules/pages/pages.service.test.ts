/**
 * Unit tests — page service: stable slug on create, Content-Editor edit restriction (published pages
 * require a Publisher), lifecycle archive/restore, and public visibility (a non-public page is not
 * returned). Repository + cross-module services are mocked, so these run DB-free.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ResolvedAuthorization } from '@/modules/auth/auth.types';

const { repo, cache, audit } = vi.hoisted(() => ({
  repo: {
    slugExists: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
}));

vi.mock('./pages.repository', () => ({ pageRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));

import { pageService } from './pages.service';
import { PermissionError, NotFoundError } from '@/shared/errors';

const NOW = new Date('2026-06-25T00:00:00.000Z');

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'p-1',
    slug: 'about-us',
    titleEn: 'About Us',
    titleHi: null,
    bodyEn: null,
    bodyHi: null,
    metaTitleEn: null,
    metaTitleHi: null,
    metaDescriptionEn: null,
    metaDescriptionHi: null,
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
  repo.update.mockImplementation(async () => makeRow());
  repo.create.mockImplementation(async () => makeRow());
});

describe('pageService.create', () => {
  it('generates a slug from the title and persists author + default visibility', async () => {
    await pageService.create({ title_en: 'About Us' } as never, ctx(editor));
    expect(repo.slugExists).toHaveBeenCalled();
    const data = repo.create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(data.slug).toBe('about-us');
    expect(data.createdById).toBe('u-1');
    expect(data.publicVisibility).toBe(true);
  });
});

describe('pageService.update — Content Editor restriction', () => {
  it('rejects a Content Editor editing a PUBLISHED page (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(pageService.update('p-1', { title_hi: 'x' }, ctx(editor))).rejects.toBeInstanceOf(PermissionError);
  });
  it('allows a Content Editor editing a DRAFT page', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    await expect(pageService.update('p-1', { title_hi: 'x' }, ctx(editor))).resolves.toBeDefined();
  });
  it('allows a Publisher editing a PUBLISHED page', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(pageService.update('p-1', { title_hi: 'x' }, ctx(publisher))).resolves.toBeDefined();
  });
  it('never changes the slug on update', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    await pageService.update('p-1', { title_en: 'Renamed' }, ctx(editor));
    const data = repo.update.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(data).not.toHaveProperty('slug');
  });
});

describe('pageService.lifecycle — archive/restore', () => {
  it('archives a published page (sets archivedAt)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await pageService.lifecycle('p-1', 'archive', ctx(publisher));
    const data = repo.update.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(data.publicationState).toBe('archived');
    expect(data.archivedAt).toBeInstanceOf(Date);
  });
  it('restore returns an archived page to unpublished (never auto-republishes)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'archived', archivedAt: NOW }));
    await pageService.lifecycle('p-1', 'restore', ctx(publisher));
    const data = repo.update.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(data.publicationState).toBe('unpublished');
    expect(data.archivedAt).toBeNull();
  });
});

describe('pageService.publicDetailBySlug — public visibility', () => {
  it('throws 404 when the page is not publicly visible', async () => {
    cache.getJson.mockResolvedValue(null);
    repo.findBySlug.mockResolvedValue(null); // repo applies the public predicate
    await expect(pageService.publicDetailBySlug('about-us')).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.findBySlug).toHaveBeenCalledWith('about-us', { public: true });
  });
  it('returns the cached dto when present (no repo hit)', async () => {
    cache.getJson.mockResolvedValue({ id: 'p-1', slug: 'about-us' });
    const dto = await pageService.publicDetailBySlug('about-us');
    expect(dto.slug).toBe('about-us');
    expect(repo.findBySlug).not.toHaveBeenCalled();
  });
});
