'use client';

/**
 * Toolkit catalogue items manager (shown on the toolkit detail). Lists the ordered items the
 * backend returns (toolkit.items, already sorted by display_order), and provides add / edit /
 * delete / reorder — every operation a backend call (toolkit_items.* CRUD). Reordering swaps the
 * two neighbours' `display_order` values via the update endpoint; the frontend never invents an
 * ordering. No totals are computed here — items carry catalogue defaults only.
 *
 * Affordances are permission-aware (TOOLKIT_ITEM_PERMS); the backend remains the security boundary
 * and additionally restricts a Content Editor to draft-parent toolkits.
 */

import { useState } from 'react';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Package } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useDeleteToolkitItem, useUpdateToolkitItem, TOOLKIT_ITEM_PERMS } from '../api';
import type { ToolkitDetail, ToolkitItem } from '../types';
import { ToolkitItemDialog } from './toolkit-item-dialog';

export function ToolkitItemsManager({ toolkit }: { toolkit: ToolkitDetail }) {
  const items = toolkit.items;
  const confirm = useConfirmDialog();
  const remove = useDeleteToolkitItem();
  const update = useUpdateToolkitItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ToolkitItem | undefined>(undefined);

  const openAdd = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (item: ToolkitItem) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const onDelete = async (item: ToolkitItem) => {
    if (await confirm.confirmDelete(`the item "${item.name_en}"`)) {
      remove.mutate({ toolkitId: toolkit.id, itemId: item.id });
    }
  };

  /** Swap an item with its neighbour by exchanging display_order values (backend-driven order). */
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[index];
    const b = items[target];
    if (!a || !b) return;
    const [newA, newB] = a.display_order === b.display_order ? [target, index] : [b.display_order, a.display_order];
    await update.mutateAsync({ toolkitId: toolkit.id, itemId: a.id, body: { display_order: newA } });
    await update.mutateAsync({ toolkitId: toolkit.id, itemId: b.id, body: { display_order: newB } });
  };

  const reordering = update.isPending;

  return (
    <Card>
      <CardHeader
        title="Toolkit items"
        description="Ordered catalogue lines. Distribution totals are recorded per event and calculated by the backend."
        actions={
          <Can permission={TOOLKIT_ITEM_PERMS.create}>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>
              Add item
            </Button>
          </Can>
        }
      />
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Package}
              title="No items yet"
              description="Add the catalogue items that make up this toolkit."
              action={
                <Can permission={TOOLKIT_ITEM_PERMS.create}>
                  <Button size="sm" onClick={openAdd}>
                    Add item
                  </Button>
                </Can>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border" aria-label="Toolkit items">
            {items.map((item, index) => (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex flex-col">
                  <Can permission={TOOLKIT_ITEM_PERMS.update}>
                    <button
                      type="button"
                      onClick={() => void move(index, -1)}
                      disabled={index === 0 || reordering}
                      aria-label={`Move ${item.name_en} up`}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(index, 1)}
                      disabled={index === items.length - 1 || reordering}
                      aria-label={`Move ${item.name_en} down`}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </Can>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{item.name_en}</span>
                    <Badge tone={item.distribution_basis === 'group' ? 'info' : 'default'}>{item.distribution_basis}</Badge>
                    {!item.is_active ? <Badge tone="warning">Inactive</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.unit ? <>Unit: {item.unit} · </> : null}
                    {item.default_quantity_per_unit != null ? <>Qty/unit: {item.default_quantity_per_unit} · </> : null}
                    {item.distribution_basis === 'group' && item.default_group_size != null ? <>Group size: {item.default_group_size} · </> : null}
                    Order: {item.display_order}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Can permission={TOOLKIT_ITEM_PERMS.update}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)} aria-label={`Edit ${item.name_en}`}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Can>
                  <Can permission={TOOLKIT_ITEM_PERMS.delete}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void onDelete(item)}
                      aria-label={`Delete ${item.name_en}`}
                      isLoading={remove.isPending && remove.variables?.itemId === item.id}
                    >
                      <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                    </Button>
                  </Can>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ToolkitItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        toolkitId={toolkit.id}
        item={editing}
        nextDisplayOrder={items.length}
      />
    </Card>
  );
}
