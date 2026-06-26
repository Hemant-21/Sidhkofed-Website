'use client';

/**
 * Accessible menu hierarchy view for one location. Renders the backend tree (parent_id +
 * display_order) read-only-structurally, with controls that PERSIST every change through the API:
 *   - expand / collapse (local UI state only)
 *   - move up / down  → reorder endpoint (swaps display_order with the adjacent sibling)
 *   - activate / deactivate → PATCH is_active
 *   - edit → form route
 *   - delete → Super Admin only, confirm-gated (cascades children)
 *
 * The frontend never invents persistence: ordering uses the backend's own display_order, and the
 * backend validates parents/cycles. Built as an ARIA tree (role=tree/treeitem/group).
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { ROUTES } from '@/constants/routes';
import type { MenuItem } from '../types';
import { MENU_DELETE_ROLES, MENU_PERMS } from '../permissions';
import { buildMenuTree, siblingsOf, type MenuTreeNode } from '../menu-tree';
import { useReorderMenuItems, useToggleMenuActive, useDeleteMenuItem } from '../hooks';

export function MenuTreeView({ items }: { items: MenuItem[] }) {
  const tree = buildMenuTree(items);
  const reorder = useReorderMenuItems();
  const toggleActive = useToggleMenuActive();
  const remove = useDeleteMenuItem();
  const confirm = useConfirmDialog();

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const busy = reorder.isPending || toggleActive.isPending || remove.isPending;

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Swap a node with its previous/next sibling and persist both new display_orders. */
  const move = (item: MenuItem, direction: -1 | 1) => {
    const siblings = siblingsOf(items, item.parent_id ?? null);
    const index = siblings.findIndex((s) => s.id === item.id);
    const target = siblings[index + direction];
    if (!target) return;
    reorder.mutate({
      items: [
        { id: item.id, display_order: target.display_order },
        { id: target.id, display_order: item.display_order },
      ],
    });
  };

  const onDelete = async (item: MenuItem) => {
    const ok = await confirm.confirmDelete(
      `the menu item “${item.label_en}”`,
      'Deleting this item also removes any child items beneath it. This cannot be undone.',
    );
    if (ok) remove.mutate(item.id);
  };

  if (items.length === 0) return null;

  const renderNodes = (nodes: MenuTreeNode[]) =>
    nodes.map((node, index) => {
      const { item, children } = node;
      const hasChildren = children.length > 0;
      const isCollapsed = collapsed.has(item.id);
      const isFirst = index === 0;
      const isLast = index === nodes.length - 1;

      return (
        <li
          key={item.id}
          role="treeitem"
          aria-selected={false}
          aria-expanded={hasChildren ? !isCollapsed : undefined}
        >
          <div
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
            style={{ marginLeft: node.depth * 20 }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleCollapse(item.id)}
                aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            ) : (
              <span className="inline-block w-5" aria-hidden="true" />
            )}

            {item.page ? (
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}

            <div className="min-w-0 flex-1">
              <Link
                href={`${ROUTES.menus}/${item.id}`}
                className="font-medium text-foreground hover:text-primary hover:underline"
              >
                {item.label_en}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {item.page ? `/${item.page.slug}` : (item.url ?? '—')}
                {item.opens_new_tab ? (
                  <ExternalLink className="ml-1 inline h-3 w-3" aria-label="opens in a new tab" />
                ) : null}
              </p>
            </div>

            {!item.is_active ? <Badge tone="muted">Inactive</Badge> : null}

            <div className="flex items-center gap-1">
              <Can permission={MENU_PERMS.update}>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move up"
                  disabled={isFirst || busy}
                  onClick={() => move(item, -1)}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  disabled={isLast || busy}
                  onClick={() => move(item, 1)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={item.is_active ? 'Deactivate' : 'Activate'}
                  disabled={busy}
                  onClick={() => toggleActive.mutate({ id: item.id, is_active: !item.is_active })}
                >
                  {item.is_active ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
                <Button asChild variant="ghost" size="icon" aria-label="Edit">
                  <Link href={`${ROUTES.menus}/${item.id}/edit`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </Can>
              <Can role={MENU_DELETE_ROLES}>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete"
                  disabled={busy}
                  onClick={() => void onDelete(item)}
                >
                  <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                </Button>
              </Can>
            </div>
          </div>

          {hasChildren && !isCollapsed ? (
            <ul role="group" className="mt-2 space-y-2">
              {renderNodes(children)}
            </ul>
          ) : null}
        </li>
      );
    });

  return (
    <ul role="tree" aria-label="Menu hierarchy" className="space-y-2">
      {renderNodes(tree)}
    </ul>
  );
}
