import { describe, expect, it } from 'vitest';
import { buildMenuTree, siblingsOf } from './menu-tree';
import type { MenuItem } from './types';

/**
 * Tree-building regression (Phase 15.7). The helper READS the backend hierarchy (parent_id +
 * display_order); it must order siblings by display_order, nest children under parents, and never
 * hide a row whose parent is absent (surfaced at the root).
 */
function item(overrides: Partial<MenuItem> & { id: string }): MenuItem {
  return {
    label_en: overrides.id,
    label_hi: null,
    location: 'header',
    url: '/x',
    page: null,
    parent_id: null,
    opens_new_tab: false,
    display_order: 0,
    is_active: true,
    created_by: null,
    updated_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildMenuTree', () => {
  it('orders roots by display_order', () => {
    const tree = buildMenuTree([
      item({ id: 'b', display_order: 2 }),
      item({ id: 'a', display_order: 1 }),
    ]);
    expect(tree.map((n) => n.item.id)).toEqual(['a', 'b']);
  });

  it('nests children under their parent with increasing depth', () => {
    const tree = buildMenuTree([
      item({ id: 'parent', display_order: 1 }),
      item({ id: 'child', parent_id: 'parent', display_order: 1 }),
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.depth).toBe(0);
    expect(tree[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.item.id).toBe('child');
    expect(tree[0]!.children[0]!.depth).toBe(1);
  });

  it('surfaces an orphan (missing parent) at the root rather than hiding it', () => {
    const tree = buildMenuTree([item({ id: 'orphan', parent_id: 'gone' })]);
    expect(tree.map((n) => n.item.id)).toEqual(['orphan']);
  });
});

describe('siblingsOf', () => {
  it('returns ordered siblings sharing a parent', () => {
    const items = [
      item({ id: 'p' }),
      item({ id: 'c2', parent_id: 'p', display_order: 2 }),
      item({ id: 'c1', parent_id: 'p', display_order: 1 }),
    ];
    expect(siblingsOf(items, 'p').map((s) => s.id)).toEqual(['c1', 'c2']);
    expect(siblingsOf(items, null).map((s) => s.id)).toEqual(['p']);
  });
});
