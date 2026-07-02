/**
 * Menu repository — the ONLY Prisma caller for this module (coding-standards §6). Returns entities,
 * never DTOs. Holds the two include shapes: the admin shape (compact page ref) and the public shape
 * (page ref + the page's publishing-workflow fields, so the service can drop items pointing at a
 * non-public page).
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import type { MenuItemFilters, MenuLocation } from './menus.types';

type Db = PrismaClient | Prisma.TransactionClient;

// Admin include: compact page reference for the flat representation.
const menuItemInclude = {
  page: { select: { id: true, slug: true, titleEn: true } },
} satisfies Prisma.MenuItemInclude;
export type MenuItemRow = Prisma.MenuItemGetPayload<{ include: typeof menuItemInclude }>;

// Public include: page reference + the page's visibility fields (so a menu item pointing at a
// draft/archived/hidden/future page is dropped from the public tree).
const publicMenuItemInclude = {
  page: {
    select: {
      id: true,
      slug: true,
      titleEn: true,
      publicationState: true,
      publicVisibility: true,
      archivedAt: true,
      publishStartAt: true,
    },
  },
} satisfies Prisma.MenuItemInclude;
export type PublicMenuItemRow = Prisma.MenuItemGetPayload<{ include: typeof publicMenuItemInclude }>;

export async function create(data: Prisma.MenuItemUncheckedCreateInput, db: Db = prisma): Promise<MenuItemRow> {
  return db.menuItem.create({ data, include: menuItemInclude });
}

export async function findById(id: string, db: Db = prisma): Promise<MenuItemRow | null> {
  return db.menuItem.findUnique({ where: { id }, include: menuItemInclude });
}

/** Minimal lookup (id + parentId + location) for cycle detection and consistency checks. */
export async function findRefById(
  id: string,
  db: Db = prisma,
): Promise<{ id: string; parentId: string | null; location: string } | null> {
  return db.menuItem.findUnique({ where: { id }, select: { id: true, parentId: true, location: true } });
}

export async function update(id: string, data: Prisma.MenuItemUncheckedUpdateInput, db: Db = prisma): Promise<MenuItemRow> {
  return db.menuItem.update({ where: { id }, data, include: menuItemInclude });
}

export async function remove(id: string, db: Db = prisma): Promise<void> {
  await db.menuItem.delete({ where: { id } });
}

export async function countChildren(parentId: string, db: Db = prisma): Promise<number> {
  return db.menuItem.count({ where: { parentId } });
}

/** Admin list (flat), ordered by location then display order then created time. */
export async function list(f: MenuItemFilters): Promise<MenuItemRow[]> {
  const where: Prisma.MenuItemWhereInput = {};
  if (f.location) where.location = f.location;
  if (f.isActive !== undefined) where.isActive = f.isActive;
  return prisma.menuItem.findMany({
    where,
    include: menuItemInclude,
    orderBy: [{ location: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

/** Public: all ACTIVE items for a location (the tree is assembled in the service). */
export async function listActiveByLocation(location: MenuLocation): Promise<PublicMenuItemRow[]> {
  return prisma.menuItem.findMany({
    where: { location, isActive: true },
    include: publicMenuItemInclude,
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

/** Whether a page exists (referenced-page validation). */
export async function pageExists(pageId: string, db: Db = prisma): Promise<boolean> {
  return (await db.page.count({ where: { id: pageId } })) > 0;
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

export const menuRepository = {
  create,
  findById,
  findRefById,
  update,
  remove,
  countChildren,
  list,
  listActiveByLocation,
  pageExists,
  transaction,
};
