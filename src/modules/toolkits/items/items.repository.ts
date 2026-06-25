/**
 * Toolkit item repository — the ONLY Prisma caller for toolkit_items. Returns entities, never DTOs.
 * All reads/writes are scoped to a parent toolkit id (the route nests under /toolkits/{id}/items).
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export async function listByToolkit(toolkitId: string, db: Db = prisma): Promise<Prisma.ToolkitItemGetPayload<true>[]> {
  return db.toolkitItem.findMany({
    where: { toolkitId },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function findByIdForToolkit(
  id: string,
  toolkitId: string,
  db: Db = prisma,
): Promise<Prisma.ToolkitItemGetPayload<true> | null> {
  return db.toolkitItem.findFirst({ where: { id, toolkitId } });
}

/** Case-insensitive duplicate-name check within the parent toolkit (optionally excluding one id). */
export async function nameExists(
  toolkitId: string,
  nameEn: string,
  excludeId: string | undefined,
  db: Db = prisma,
): Promise<boolean> {
  const count = await db.toolkitItem.count({
    where: {
      toolkitId,
      nameEn: { equals: nameEn, mode: 'insensitive' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return count > 0;
}

export async function create(data: Prisma.ToolkitItemUncheckedCreateInput, db: Db = prisma): Promise<Prisma.ToolkitItemGetPayload<true>> {
  return db.toolkitItem.create({ data });
}

export async function update(id: string, data: Prisma.ToolkitItemUncheckedUpdateInput, db: Db = prisma): Promise<Prisma.ToolkitItemGetPayload<true>> {
  return db.toolkitItem.update({ where: { id }, data });
}

export async function remove(id: string, db: Db = prisma): Promise<void> {
  await db.toolkitItem.delete({ where: { id } });
}

/** Active item ids for a toolkit — used to validate distribution-item references (cross-module). */
export async function activeItemIds(toolkitId: string, db: Db = prisma): Promise<Set<string>> {
  const rows = await db.toolkitItem.findMany({ where: { toolkitId, isActive: true }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

export const toolkitItemRepository = {
  listByToolkit,
  findByIdForToolkit,
  nameExists,
  create,
  update,
  remove,
  activeItemIds,
};
