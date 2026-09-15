/**
 * The ONLY Prisma caller for the Website Metrics module (coding-standards §6) — `WebsiteMetric` and
 * `WebsiteMetricSnapshot`.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import type { WebsiteMetricFilters, WebsiteMetricOrderingField } from './website-metrics.types';

export type WebsiteMetricRow = Prisma.WebsiteMetricGetPayload<{
  include: typeof metricInclude;
}>;
export type WebsiteMetricSnapshotRow = Prisma.WebsiteMetricSnapshotGetPayload<Record<string, never>>;

const metricInclude = {
  currentSnapshot: true,
} satisfies Prisma.WebsiteMetricInclude;

const ORDER_COLUMN: Record<WebsiteMetricOrderingField, keyof Prisma.WebsiteMetricOrderByWithRelationInput> = {
  display_order: 'displayOrder',
  created_at: 'createdAt',
};

function buildWhere(filters: WebsiteMetricFilters): Prisma.WebsiteMetricWhereInput {
  const where: Prisma.WebsiteMetricWhereInput = {};
  if (filters.placementKey !== undefined) where.placementKey = filters.placementKey;
  if (filters.isEnabled !== undefined) where.isEnabled = filters.isEnabled;
  if (filters.isArchived !== undefined) where.isArchived = filters.isArchived;
  return where;
}

async function metricKeyExists(metricKey: string, excludeId?: string): Promise<boolean> {
  const where: Prisma.WebsiteMetricWhereInput = { metricKey };
  if (excludeId) where.id = { not: excludeId };
  return (await prisma.websiteMetric.count({ where })) > 0;
}

async function create(data: Prisma.WebsiteMetricUncheckedCreateInput): Promise<WebsiteMetricRow> {
  return prisma.websiteMetric.create({ data, include: metricInclude });
}

async function findById(id: string): Promise<WebsiteMetricRow | null> {
  return prisma.websiteMetric.findUnique({ where: { id }, include: metricInclude });
}

async function update(
  id: string,
  data: Prisma.WebsiteMetricUncheckedUpdateInput,
): Promise<WebsiteMetricRow> {
  return prisma.websiteMetric.update({ where: { id }, data, include: metricInclude });
}

async function list(
  filters: WebsiteMetricFilters,
  ordering: { field: WebsiteMetricOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<{ rows: WebsiteMetricRow[]; total: number }> {
  const where = buildWhere(filters);
  const [rows, total] = await Promise.all([
    prisma.websiteMetric.findMany({
      where,
      include: metricInclude,
      orderBy: { [ORDER_COLUMN[ordering.field]]: ordering.direction },
      skip,
      take,
    }),
    prisma.websiteMetric.count({ where }),
  ]);
  return { rows, total };
}

/**
 * Stage 3 hook: all enabled, non-archived, currently-published (has a `currentSnapshotId`) metrics
 * for one placement, ordered for direct public rendering. The public endpoint / scheduler (Stage 3)
 * should build on this rather than re-deriving the scope rule.
 */
async function listPublishedForPlacement(placementKey: string): Promise<WebsiteMetricRow[]> {
  return prisma.websiteMetric.findMany({
    where: {
      placementKey,
      isEnabled: true,
      isArchived: false,
      currentSnapshotId: { not: null },
    },
    include: metricInclude,
    orderBy: { displayOrder: 'asc' },
  });
}

async function createSnapshot(
  data: Prisma.WebsiteMetricSnapshotUncheckedCreateInput,
): Promise<WebsiteMetricSnapshotRow> {
  return prisma.websiteMetricSnapshot.create({ data });
}

async function findSnapshotById(id: string): Promise<WebsiteMetricSnapshotRow | null> {
  return prisma.websiteMetricSnapshot.findUnique({ where: { id } });
}

async function listSnapshotsByMetric(metricId: string): Promise<WebsiteMetricSnapshotRow[]> {
  return prisma.websiteMetricSnapshot.findMany({
    where: { metricId },
    orderBy: { publishedAt: 'desc' },
  });
}

async function updateSnapshot(
  id: string,
  data: Prisma.WebsiteMetricSnapshotUncheckedUpdateInput,
): Promise<WebsiteMetricSnapshotRow> {
  return prisma.websiteMetricSnapshot.update({ where: { id }, data });
}

export const websiteMetricsRepository = {
  metricKeyExists,
  create,
  findById,
  update,
  list,
  listPublishedForPlacement,
  createSnapshot,
  findSnapshotById,
  listSnapshotsByMetric,
  updateSnapshot,
};

export type WebsiteMetricsRepository = typeof websiteMetricsRepository;
