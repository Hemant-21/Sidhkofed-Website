/**
 * Menu service — all business logic for the MenuItem operation. No HTTP, no Prisma here (repository
 * owns Prisma; controllers own HTTP). Owns: CRUD, hierarchy integrity (self-parent + cycle
 * prevention, parent/child location consistency), referenced-page + url validation, reorder, the
 * Super-Admin-only confirmed delete (cascade), the public active nested tree, audit logging, and
 * Redis cache invalidation of public reads.
 *
 * Hierarchy rules (CMS requirements §4.11 / API spec §6): the menu tree is self-referencing and must
 * stay ACYCLIC — an item may not be its own parent, nor may its parent be one of its descendants.
 */
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors';
import { isPubliclyVisible } from '@/shared/visibility';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { menuRepository, type MenuItemRow, type PublicMenuItemRow } from './menus.repository';
import { toMenuItemDto, toPublicMenuItemNode, type MenuItemDto, type PublicMenuItemDto } from './menus.dto';
import { MENU_ENTITY, type MenuItemFilters, type MenuLocation } from './menus.types';
import type { MenuItemCreateInput, MenuItemUpdateInput, MenuReorderInput } from './menus.validators';

const PUBLIC_CACHE_PREFIX = 'menus:public';
const MAX_DEPTH = 100; // cycle-walk safety bound

function loaded(row: MenuItemRow | null): MenuItemRow {
  if (!row) throw new NotFoundError('Menu item not found.');
  return row;
}

async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

async function assertPageExists(pageId: string): Promise<void> {
  if (!(await menuRepository.pageExists(pageId))) {
    throw new ValidationError({ page_id: ['Referenced page not found.'] });
  }
}

/**
 * Validate a proposed parent: it must exist, share the child's location, and (when `childId` is
 * given — an existing item being re-parented) NOT introduce a cycle. Walking the ancestor chain of
 * the proposed parent and finding `childId` means the parent is a descendant of the child → cycle.
 */
async function assertParentValid(parentId: string, location: MenuLocation, childId?: string): Promise<void> {
  if (childId && parentId === childId) {
    throw new ValidationError({ parent_id: ['A menu item cannot be its own parent.'] });
  }
  const parent = await menuRepository.findRefById(parentId);
  if (!parent) throw new ValidationError({ parent_id: ['Parent menu item not found.'] });
  if (parent.location !== location) {
    throw new ValidationError({ parent_id: ['Parent must be in the same menu location.'] });
  }
  if (!childId) return;

  let cursor: string | null = parent.parentId;
  for (let depth = 0; cursor && depth < MAX_DEPTH; depth += 1) {
    if (cursor === childId) {
      throw new ValidationError({ parent_id: ['This parent would create a circular menu hierarchy.'] });
    }
    const ancestor = await menuRepository.findRefById(cursor);
    cursor = ancestor?.parentId ?? null;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: MenuItemCreateInput, ctx: AuditContext): Promise<MenuItemDto> {
  const userId = requireUser(ctx);
  if (input.page_id) await assertPageExists(input.page_id);
  if (input.parent_id) await assertParentValid(input.parent_id, input.location);

  const created = await menuRepository.create({
    labelEn: input.label_en,
    labelHi: input.label_hi ?? null,
    location: input.location,
    url: input.url ?? null,
    pageId: input.page_id ?? null,
    parentId: input.parent_id ?? null,
    opensNewTab: input.opens_new_tab ?? false,
    displayOrder: input.display_order ?? 0,
    isActive: input.is_active ?? true,
    createdById: userId,
    updatedById: userId,
  });

  await auditService.create(ctx, MENU_ENTITY, created.id, { label_en: created.labelEn, location: created.location });
  await invalidatePublicCache();
  return toMenuItemDto(created);
}

// ── Update (PATCH — partial) ────────────────────────────────────────────────────
export async function update(id: string, input: MenuItemUpdateInput, ctx: AuditContext): Promise<MenuItemDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await menuRepository.findById(id));

  // The merged record must still resolve a destination (url or page_id).
  const mergedUrl = input.url !== undefined ? input.url : existing.url;
  const mergedPageId = input.page_id !== undefined ? input.page_id : existing.pageId;
  if (!mergedUrl && !mergedPageId) {
    throw new ValidationError({ url: ['A menu item must keep either a url or a page_id.'] });
  }

  if (input.page_id) await assertPageExists(input.page_id);

  const mergedLocation = (input.location ?? existing.location) as MenuLocation;

  // Changing location while children exist would split the tree across locations — block it.
  if (input.location !== undefined && input.location !== existing.location) {
    if ((await menuRepository.countChildren(id)) > 0) {
      throw new ValidationError({ location: ['Cannot change the location of a menu item that has children.'] });
    }
  }

  // Validate parent on (re)parenting, or when the location changes under an existing parent.
  const parentChanging = input.parent_id !== undefined && input.parent_id !== existing.parentId;
  if (parentChanging && input.parent_id) {
    await assertParentValid(input.parent_id, mergedLocation, id);
  } else if (input.location !== undefined && existing.parentId) {
    await assertParentValid(existing.parentId, mergedLocation, id);
  }

  const updated = await menuRepository.update(id, {
    labelEn: input.label_en,
    labelHi: input.label_hi,
    location: input.location,
    url: input.url,
    pageId: input.page_id,
    parentId: input.parent_id,
    opensNewTab: input.opens_new_tab,
    displayOrder: input.display_order,
    isActive: input.is_active,
    updatedById: userId,
  });

  await auditService.update(ctx, MENU_ENTITY, id, undefined, { label_en: updated.labelEn });
  await invalidatePublicCache();
  return toMenuItemDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<MenuItemDto> {
  return toMenuItemDto(loaded(await menuRepository.findById(id)));
}

export async function list(filters: MenuItemFilters): Promise<MenuItemDto[]> {
  const rows = await menuRepository.list(filters);
  return rows.map(toMenuItemDto);
}

// ── Reorder (siblings) ──────────────────────────────────────────────────────────
export async function reorder(input: MenuReorderInput, ctx: AuditContext): Promise<MenuItemDto[]> {
  const userId = requireUser(ctx);
  const ids = input.items.map((i) => i.id);
  // Reject duplicate ids in the request (an ordering conflict the client must resolve).
  if (new Set(ids).size !== ids.length) {
    throw new ValidationError({ items: ['Duplicate menu item ids in reorder request.'] });
  }

  const updated = await menuRepository.transaction(async (tx) => {
    const rows: MenuItemRow[] = [];
    for (const item of input.items) {
      const existing = await menuRepository.findById(item.id, tx);
      if (!existing) throw new ValidationError({ items: [`Menu item ${item.id} not found.`] });
      rows.push(await menuRepository.update(item.id, { displayOrder: item.display_order, updatedById: userId }, tx));
    }
    return rows;
  });

  await auditService.update(ctx, MENU_ENTITY, ids[0] as string, undefined, { reordered: ids });
  await invalidatePublicCache();
  return updated.map(toMenuItemDto);
}

// ── Delete (Super Admin only; confirmed; cascades children per schema) ──────────
export async function remove(id: string, confirm: boolean, ctx: AuditContext): Promise<{ deleted_child_count: number }> {
  requireUser(ctx);
  const existing = loaded(await menuRepository.findById(id));
  if (!confirm) {
    throw new ConflictError('Deletion cascades child menu items. Resend with confirm=true to proceed.');
  }
  const childCount = await menuRepository.countChildren(id);
  await menuRepository.remove(id);
  await auditService.delete(ctx, MENU_ENTITY, id, { label_en: existing.labelEn }, {
    metadata: { cascade_child_count: childCount },
  });
  await invalidatePublicCache();
  return { deleted_child_count: childCount };
}

// ── Public nested active tree (per location) ────────────────────────────────────
/**
 * Build the public menu tree for a location: only ACTIVE items, and only items whose linked page
 * (if any) is publicly visible. An item is included only when all its ancestors are also included —
 * a child of an excluded/hidden parent is dropped rather than promoted to the root.
 */
export async function publicTree(location: MenuLocation): Promise<PublicMenuItemDto[]> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:${location}`;
  const cached = await cacheService.getJson<PublicMenuItemDto[]>(cacheKey);
  if (cached) return cached;

  const rows = await menuRepository.listActiveByLocation(location);

  // Drop items whose linked page is not publicly visible (broken/hidden page references).
  const included = new Map<string, PublicMenuItemRow>();
  for (const row of rows) {
    if (row.pageId && (!row.page || !isPubliclyVisible(row.page))) continue;
    included.set(row.id, row);
  }

  // Group children by parent id (only parents that are themselves included).
  const childrenByParent = new Map<string, PublicMenuItemRow[]>();
  const roots: PublicMenuItemRow[] = [];
  for (const row of included.values()) {
    if (row.parentId && included.has(row.parentId)) {
      const siblings = childrenByParent.get(row.parentId) ?? [];
      siblings.push(row);
      childrenByParent.set(row.parentId, siblings);
    } else if (!row.parentId) {
      roots.push(row);
    }
    // else: parent exists but is excluded/hidden → drop this branch.
  }

  const sortRows = (list: PublicMenuItemRow[]): PublicMenuItemRow[] =>
    [...list].sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.getTime() - b.createdAt.getTime());

  const build = (row: PublicMenuItemRow, depth: number): PublicMenuItemDto => {
    const kids = depth < MAX_DEPTH ? sortRows(childrenByParent.get(row.id) ?? []) : [];
    return toPublicMenuItemNode(
      row,
      kids.map((k) => build(k, depth + 1)),
    );
  };

  const tree = sortRows(roots).map((r) => build(r, 0));
  await cacheService.setJson(cacheKey, tree);
  return tree;
}

export const menuService = {
  create,
  update,
  getById,
  list,
  reorder,
  remove,
  publicTree,
};
