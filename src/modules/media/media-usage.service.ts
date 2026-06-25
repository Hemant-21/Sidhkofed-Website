/**
 * Media usage tracking (TASK 6). The reusable service future modules call to register
 * where an asset is used, so linked media cannot be hard-deleted (only archived).
 *
 *   registerUsage({ mediaId, entityType, entityId, field })  — link (idempotent)
 *   removeUsage({ ... })                                      — unlink
 *   whereUsed(mediaId)                                        — list usages
 *   isUsed(mediaId)                                           — delete-protection check
 *
 * Writes are idempotent via the `(media_id, entity_type, entity_id, field)` unique key.
 * Modules should call register/remove inside their own `prisma.$transaction` when
 * linking/unlinking (coding-standards §5).
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';

/** A Prisma client or an active transaction client. */
type Db = PrismaClient | Prisma.TransactionClient;

export interface UsageRef {
  mediaId: string;
  /** Consuming entity key, e.g. `gallery`, `event`, `document`. */
  entityType: string;
  entityId: string;
  /** The field on the entity that holds the reference, e.g. `cover_media_id`. */
  field: string;
}

/** Register a usage link (idempotent). Pass a tx client to join the caller's transaction. */
export async function registerUsage(ref: UsageRef, db: Db = prisma): Promise<void> {
  await db.mediaUsage.upsert({
    where: {
      mediaId_entityType_entityId_field: {
        mediaId: ref.mediaId,
        entityType: ref.entityType,
        entityId: ref.entityId,
        field: ref.field,
      },
    },
    update: {},
    create: ref,
  });
}

/** Remove a usage link (no-op if absent). */
export async function removeUsage(ref: UsageRef, db: Db = prisma): Promise<void> {
  await db.mediaUsage.deleteMany({
    where: { mediaId: ref.mediaId, entityType: ref.entityType, entityId: ref.entityId, field: ref.field },
  });
}

export interface UsageRecord {
  entityType: string;
  entityId: string;
  field: string;
  createdAt: Date;
}

/** All places a media asset is currently used. */
export async function whereUsed(mediaId: string, db: Db = prisma): Promise<UsageRecord[]> {
  const rows = await db.mediaUsage.findMany({
    where: { mediaId },
    select: { entityType: true, entityId: true, field: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows;
}

/** Whether the asset is referenced anywhere (blocks hard-delete). */
export async function isUsed(mediaId: string, db: Db = prisma): Promise<boolean> {
  const count = await db.mediaUsage.count({ where: { mediaId } });
  return count > 0;
}

export const mediaUsageService = { registerUsage, removeUsage, whereUsed, isUsed };
