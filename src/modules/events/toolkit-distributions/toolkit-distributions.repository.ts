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

/** Public aggregation source: every summary for the toolkit whose event is publicly visible. */
export async function publishedSummariesForToolkit(toolkitId: string): Promise<DistributionSummaryRow[]> {
  return prisma.toolkitDistributionSummary.findMany({
    where: { toolkitId, event: publicVisibilityWhere() as Prisma.EventWhereInput },
    include: summaryInclude,
    orderBy: { createdAt: 'asc' },
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
  publishedSummariesForToolkit,
};
