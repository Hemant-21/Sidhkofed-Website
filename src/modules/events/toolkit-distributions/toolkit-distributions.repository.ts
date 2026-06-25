/**
 * Toolkit distribution repository — the ONLY Prisma caller for toolkit_distribution_summaries and
 * toolkit_distribution_items (coding-standards §6). Summaries are scoped to a parent event; the
 * public aggregation reads only summaries whose event is publicly visible. Returns entities.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { publicVisibilityWhere } from '@/shared/visibility';

type Db = PrismaClient | Prisma.TransactionClient;

const summaryInclude = {
  toolkit: { select: { id: true, slug: true, titleEn: true, titleHi: true } },
  items: {
    include: { toolkitItem: { select: { id: true, nameEn: true, nameHi: true, unit: true } } },
    orderBy: { toolkitItem: { displayOrder: 'asc' } },
  },
} satisfies Prisma.ToolkitDistributionSummaryInclude;

export type DistributionSummaryRow = Prisma.ToolkitDistributionSummaryGetPayload<{ include: typeof summaryInclude }>;

export async function listByEvent(eventId: string): Promise<DistributionSummaryRow[]> {
  return prisma.toolkitDistributionSummary.findMany({
    where: { eventId },
    include: summaryInclude,
    orderBy: { createdAt: 'asc' },
  });
}

export async function findByIdForEvent(id: string, eventId: string): Promise<DistributionSummaryRow | null> {
  return prisma.toolkitDistributionSummary.findFirst({ where: { id, eventId }, include: summaryInclude });
}

export async function existsForEventToolkit(eventId: string, toolkitId: string): Promise<boolean> {
  return (await prisma.toolkitDistributionSummary.count({ where: { eventId, toolkitId } })) > 0;
}

export async function findById(id: string, db: Db = prisma): Promise<DistributionSummaryRow | null> {
  return db.toolkitDistributionSummary.findUnique({ where: { id }, include: summaryInclude });
}

export async function createSummary(
  data: Prisma.ToolkitDistributionSummaryUncheckedCreateInput,
  db: Db,
): Promise<{ id: string }> {
  const row = await db.toolkitDistributionSummary.create({ data, select: { id: true } });
  return row;
}

export async function updateSummary(
  id: string,
  data: Prisma.ToolkitDistributionSummaryUncheckedUpdateInput,
  db: Db,
): Promise<void> {
  await db.toolkitDistributionSummary.update({ where: { id }, data });
}

export async function removeSummary(id: string, db: Db = prisma): Promise<void> {
  await db.toolkitDistributionSummary.delete({ where: { id } });
}

export async function replaceItems(
  summaryId: string,
  items: Array<Omit<Prisma.ToolkitDistributionItemUncheckedCreateInput, 'toolkitDistributionSummaryId'>>,
  db: Db,
): Promise<void> {
  await db.toolkitDistributionItem.deleteMany({ where: { toolkitDistributionSummaryId: summaryId } });
  if (items.length > 0) {
    await db.toolkitDistributionItem.createMany({
      data: items.map((it) => ({ ...it, toolkitDistributionSummaryId: summaryId })),
    });
  }
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

// ── Public aggregation, computed in the database (no full-history load) ──────────
const visibleSummaryWhere = (toolkitId: string): Prisma.ToolkitDistributionSummaryWhereInput => ({
  toolkitId,
  event: publicVisibilityWhere() as Prisma.EventWhereInput,
});

export interface SummaryModelGroup {
  distributionModel: string;
  summaryCount: number;
  participantsCovered: number;
}

/** Per-distribution-model counts + participant sums for the toolkit's publicly-visible summaries. */
export async function aggregateSummaryModels(toolkitId: string): Promise<SummaryModelGroup[]> {
  const groups = await prisma.toolkitDistributionSummary.groupBy({
    by: ['distributionModel'],
    where: visibleSummaryWhere(toolkitId),
    _count: { _all: true },
    _sum: { participantsCovered: true },
  });
  return groups.map((g) => ({
    distributionModel: g.distributionModel,
    summaryCount: g._count._all,
    participantsCovered: g._sum.participantsCovered ?? 0,
  }));
}

export interface ItemTotalGroup {
  toolkitItemId: string;
  totalQuantity: Prisma.Decimal | null;
}

/** Per-item summed `total_quantity` across the toolkit's publicly-visible distribution summaries. */
export async function aggregateItemTotals(toolkitId: string): Promise<ItemTotalGroup[]> {
  const groups = await prisma.toolkitDistributionItem.groupBy({
    by: ['toolkitItemId'],
    where: { summary: visibleSummaryWhere(toolkitId) },
    _sum: { totalQuantity: true },
  });
  return groups.map((g) => ({ toolkitItemId: g.toolkitItemId, totalQuantity: g._sum.totalQuantity }));
}

export interface ItemMetadata {
  id: string;
  nameEn: string;
  nameHi: string | null;
  unit: string | null;
  distributionBasis: string;
  displayOrder: number;
}

/** Canonical metadata for the given toolkit items, ordered for stable public output. */
export async function itemMetadata(itemIds: string[]): Promise<ItemMetadata[]> {
  if (itemIds.length === 0) return [];
  return prisma.toolkitItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, nameEn: true, nameHi: true, unit: true, distributionBasis: true, displayOrder: true },
    orderBy: [{ displayOrder: 'asc' }, { nameEn: 'asc' }],
  });
}

export const distributionRepository = {
  listByEvent,
  findByIdForEvent,
  existsForEventToolkit,
  findById,
  createSummary,
  updateSummary,
  removeSummary,
  replaceItems,
  transaction,
  aggregateSummaryModels,
  aggregateItemTotals,
  itemMetadata,
};
