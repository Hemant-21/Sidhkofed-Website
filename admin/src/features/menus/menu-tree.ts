/**
 * Pure presentation helper (unit-testable; no React). Groups the backend's FLAT menu-item list into
 * the display tree the editor renders, ordered exactly by the backend's `display_order` then label.
 *
 * This READS the backend hierarchy (parent_id + display_order) — it does NOT compute, persist, or
 * validate it. The backend owns the acyclic tree; reordering/parent changes go through the API. Any
 * item whose parent is missing from the current set is surfaced at the root so nothing is hidden.
 */

import type { MenuItem } from './types';

export interface MenuTreeNode {
  item: MenuItem;
  depth: number;
  children: MenuTreeNode[];
}

const byOrder = (a: MenuItem, b: MenuItem): number =>
  a.display_order - b.display_order || a.label_en.localeCompare(b.label_en);

/** Build an ordered tree from a flat list (already scoped to one location by the caller). */
export function buildMenuTree(items: MenuItem[]): MenuTreeNode[] {
  const ids = new Set(items.map((i) => i.id));
  const childrenOf = new Map<string | null, MenuItem[]>();

  for (const item of items) {
    // Treat an item whose parent is absent from this set as a root (defensive — never hide a row).
    const key = item.parent_id && ids.has(item.parent_id) ? item.parent_id : null;
    const bucket = childrenOf.get(key) ?? [];
    bucket.push(item);
    childrenOf.set(key, bucket);
  }

  const build = (parentId: string | null, depth: number): MenuTreeNode[] =>
    (childrenOf.get(parentId) ?? [])
      .slice()
      .sort(byOrder)
      .map((item) => ({ item, depth, children: build(item.id, depth + 1) }));

  return build(null, 0);
}

/** Ordered siblings sharing a parent (used by the move up/down reorder controls). */
export function siblingsOf(items: MenuItem[], parentId: string | null): MenuItem[] {
  const ids = new Set(items.map((i) => i.id));
  return items
    .filter((i) => (i.parent_id && ids.has(i.parent_id) ? i.parent_id : null) === parentId)
    .sort(byOrder);
}
