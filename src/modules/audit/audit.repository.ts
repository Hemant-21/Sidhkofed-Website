/**
 * Audit repository — the only Prisma caller for `audit_logs`. Reads are list/detail; the
 * single write is an append (the table is append-only — never updated/deleted). Routing the
 * write through here keeps the repository pattern consistent across modules (Issue 10).
 */
import type { Prisma, AuditAction as PrismaAuditAction } from '@prisma/client';
import { prisma } from '@/db/prisma';

export interface AuditCreateInput {
  userId: string | null;
  action: PrismaAuditAction;
  module: string;
  recordId: string | null;
  previousState: string | null;
  newState: string | null;
  changeSummary: string;
  metadata: Prisma.InputJsonValue;
  ipHash: string | null;
}

/** Append one immutable audit row. Throws on failure — the service decides how to react. */
export async function create(data: AuditCreateInput): Promise<void> {
  await prisma.auditLog.create({ data });
}

export interface AuditListFilters {
  module?: string;
  recordId?: string;
  userId?: string;
  action?: PrismaAuditAction;
  dateFrom?: Date;
  dateTo?: Date;
}

function buildWhere(f: AuditListFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (f.module) where.module = f.module;
  if (f.recordId) where.recordId = f.recordId;
  if (f.userId) where.userId = f.userId;
  if (f.action) where.action = f.action;
  if (f.dateFrom || f.dateTo) {
    where.createdAt = {};
    if (f.dateFrom) where.createdAt.gte = f.dateFrom;
    if (f.dateTo) where.createdAt.lte = f.dateTo;
  }
  return where;
}

export async function list(
  filters: AuditListFilters,
  skip: number,
  take: number,
  direction: 'asc' | 'desc',
): Promise<{ rows: AuditRow[]; total: number }> {
  const where = buildWhere(filters);
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, fullName: true } } },
      orderBy: { createdAt: direction },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { rows, total };
}

export async function findById(id: string): Promise<AuditRow | null> {
  return prisma.auditLog.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });
}

export type AuditRow = Prisma.AuditLogGetPayload<{
  include: { user: { select: { id: true; email: true; fullName: true } } };
}>;

export const auditRepository = { list, findById, create };
