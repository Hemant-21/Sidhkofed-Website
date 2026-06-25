/**
 * Unit tests — menu service: hierarchy integrity (self-parent + circular-reference prevention,
 * parent/child location consistency), broken page-reference rejection, confirmed cascade delete,
 * reorder de-duplication, and the public active nested tree (visibility filtering + ordering +
 * orphan dropping). Repository + cache/audit mocked; the real `isPubliclyVisible` predicate runs.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, cache, audit } = vi.hoisted(() => ({
  repo: {
    pageExists: vi.fn(),
    findRefById: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    countChildren: vi.fn(),
    listActiveByLocation: vi.fn(),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), log: vi.fn() },
}));

vi.mock('./menus.repository', () => ({ menuRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));

import { menuService } from './menus.service';
import { ValidationError, ConflictError } from '@/shared/errors';

const NOW = new Date('2026-06-25T00:00:00.000Z');
const ctx = { userId: 'u-1' };

function adminRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'm-1',
    labelEn: 'About',
    labelHi: null,
    location: 'header',
    url: '/about',
    page: null,
    pageId: null,
    parentId: null,
    opensNewTab: false,
    displayOrder: 0,
    isActive: true,
    createdById: 'u-1',
    updatedById: 'u-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.pageExists.mockResolvedValue(true);
  repo.countChildren.mockResolvedValue(0);
  repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
  repo.create.mockImplementation(async () => adminRow());
  repo.update.mockImplementation(async () => adminRow());
});

describe('menuService.create — reference + parent validation', () => {
  it('rejects a broken page reference (422)', async () => {
    repo.pageExists.mockResolvedValue(false);
    await expect(
      menuService.create({ label_en: 'About', location: 'header', page_id: '4'.repeat(8) } as never, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });
  it('rejects a parent in a different location (422)', async () => {
    repo.findRefById.mockResolvedValue({ id: 'p', parentId: null, location: 'footer' });
    await expect(
      menuService.create({ label_en: 'Child', location: 'header', url: '/c', parent_id: 'p' } as never, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
  });
  it('creates a valid root item', async () => {
    await menuService.create({ label_en: 'About', location: 'header', url: '/about' } as never, ctx);
    expect(repo.create).toHaveBeenCalled();
    expect(cache.delByPrefix).toHaveBeenCalled();
  });
});

describe('menuService.update — circular-reference prevention', () => {
  it('rejects self-parenting (422)', async () => {
    repo.findById.mockResolvedValue(adminRow({ id: 'a' }));
    await expect(menuService.update('a', { parent_id: 'a' }, ctx)).rejects.toBeInstanceOf(ValidationError);
  });
  it('rejects a parent that is a descendant of the item (cycle, 422)', async () => {
    repo.findById.mockResolvedValue(adminRow({ id: 'a', location: 'header' }));
    // Proposed parent 'b' has 'a' as its own parent → making 'b' the parent of 'a' is a cycle.
    repo.findRefById.mockResolvedValue({ id: 'b', parentId: 'a', location: 'header' });
    await expect(menuService.update('a', { parent_id: 'b' }, ctx)).rejects.toBeInstanceOf(ValidationError);
  });
  it('accepts a valid (acyclic) reparent', async () => {
    repo.findById.mockResolvedValue(adminRow({ id: 'a', location: 'header' }));
    repo.findRefById.mockResolvedValue({ id: 'b', parentId: null, location: 'header' });
    await expect(menuService.update('a', { parent_id: 'b' }, ctx)).resolves.toBeDefined();
  });
  it('keeps the destination invariant — clearing url while no page_id exists is rejected', async () => {
    repo.findById.mockResolvedValue(adminRow({ url: '/about', pageId: null }));
    await expect(menuService.update('m-1', { url: null }, ctx)).rejects.toBeInstanceOf(ValidationError);
  });
  it('blocks changing location when the item has children', async () => {
    repo.findById.mockResolvedValue(adminRow({ id: 'a', location: 'header' }));
    repo.countChildren.mockResolvedValue(2);
    await expect(menuService.update('a', { location: 'footer' }, ctx)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('menuService.reorder', () => {
  it('rejects duplicate ids in the request', async () => {
    await expect(
      menuService.reorder({ items: [{ id: 'x', display_order: 1 }, { id: 'x', display_order: 2 }] } as never, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
  });
  it('updates display_order for each item', async () => {
    repo.findById.mockResolvedValue(adminRow({ id: 'x' }));
    await menuService.reorder({ items: [{ id: 'x', display_order: 5 }] } as never, ctx);
    expect(repo.update).toHaveBeenCalledWith('x', expect.objectContaining({ displayOrder: 5 }), expect.anything());
  });
});

describe('menuService.remove — confirmed cascade delete', () => {
  it('rejects deletion without confirm=true (409)', async () => {
    repo.findById.mockResolvedValue(adminRow({ id: 'a' }));
    await expect(menuService.remove('a', false, ctx)).rejects.toBeInstanceOf(ConflictError);
    expect(repo.remove).not.toHaveBeenCalled();
  });
  it('deletes and reports the cascaded child count when confirmed', async () => {
    repo.findById.mockResolvedValue(adminRow({ id: 'a' }));
    repo.countChildren.mockResolvedValue(3);
    const result = await menuService.remove('a', true, ctx);
    expect(repo.remove).toHaveBeenCalledWith('a');
    expect(result.deleted_child_count).toBe(3);
    expect(audit.delete).toHaveBeenCalled();
  });
});

describe('menuService.publicTree — visibility + nesting + ordering', () => {
  function pubRow(o: Record<string, unknown>): Record<string, unknown> {
    return { labelHi: null, url: null, pageId: null, parentId: null, opensNewTab: false, page: null, createdAt: NOW, ...o };
  }
  const publishedPage = {
    id: 'pg',
    slug: 'about',
    titleEn: 'About',
    publicationState: 'published',
    publicVisibility: true,
    archivedAt: null,
    publishStartAt: null,
  };
  const draftPage = { ...publishedPage, id: 'pgd', slug: 'secret', publicationState: 'draft' };

  it('builds a nested, ordered tree and drops hidden-page items + their orphans', async () => {
    cache.getJson.mockResolvedValue(null);
    repo.listActiveByLocation.mockResolvedValue([
      pubRow({ id: 'r1', labelEn: 'Second', url: '/b', displayOrder: 2 }),
      pubRow({ id: 'r2', labelEn: 'First', url: '/a', displayOrder: 1 }),
      pubRow({ id: 'c1', labelEn: 'Child', url: '/c', parentId: 'r2', displayOrder: 1 }),
      pubRow({ id: 'h1', labelEn: 'Hidden', pageId: 'pgd', page: draftPage, displayOrder: 3 }),
      pubRow({ id: 'o1', labelEn: 'Orphan', url: '/o', parentId: 'h1', displayOrder: 1 }),
      pubRow({ id: 'pg1', labelEn: 'PageLink', pageId: 'pg', page: publishedPage, displayOrder: 4 }),
    ]);

    const tree = await menuService.publicTree('header');

    // Roots sorted by display_order: First(1), Second(2), PageLink(4). Hidden + Orphan dropped.
    expect(tree.map((n) => n.label_en)).toEqual(['First', 'Second', 'PageLink']);
    const first = tree[0]!;
    expect(first.children.map((c) => c.label_en)).toEqual(['Child']);
    // Page-linked node resolves the page route as its url.
    expect(tree[2]!.url).toBe('/pages/about');
    expect(tree[2]!.page).toEqual({ id: 'pg', slug: 'about', title_en: 'About' });
    expect(cache.setJson).toHaveBeenCalled();
  });

  it('returns the cached tree when present (no repo hit)', async () => {
    cache.getJson.mockResolvedValue([{ id: 'x', label_en: 'Cached', url: '/x', page: null, children: [] }]);
    const tree = await menuService.publicTree('footer');
    expect(tree[0]!.label_en).toBe('Cached');
    expect(repo.listActiveByLocation).not.toHaveBeenCalled();
  });
});
