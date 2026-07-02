/**
 * Scheduler repository — the scheduler's OWN Prisma caller (foundation §4: a repository is the
 * only Prisma caller for its module). It performs the cross-cutting, read-mostly maintenance
 * queries the recurring jobs need over the publishing-workflow mixin that EVERY publishable model
 * shares (publication_state, publish_start_at, highlight_type, highlight_end_at). This mirrors how
 * the Search module reads across every content table from its own repository — a cross-cutting
 * aggregator, not a reach into another module's data layer.
 *
 * IMPORTANT boundary split (so no business logic is duplicated):
 *   - Candidate DISCOVERY (which records are due/expired)            → here (generic mixin read).
 *   - Actual PUBLISH transition                                       → the owning module SERVICE
 *     (`xService.lifecycle(id,'publish',ctx)`) via the registry — reuses publish validation,
 *     `published_at` handling, audit and cache invalidation. Never re-implemented here.
 *   - Highlight-label CLEAR (no business rule; never touches publication state)
 *                                                                     → here, as a maintenance
 *     write, audited through the shared audit service by the job. It only nulls the highlight
 *     columns, so it can NEVER unpublish a record (CMS requirements §9 / API spec §3).
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';

/**
 * Prisma client property names for the 16 models carrying the publishing-workflow mixin. Kept as a
 * typed union so the registry can only ever name a real, mixin-bearing delegate.
 */
export type MixinModelName =
  | 'event'
  | 'eventNews'
  | 'programmeScheme'
  | 'document'
  | 'toolkit'
  | 'institution'
  | 'officialCommunication'
  | 'tender'
  | 'procurementUpdate'
  | 'page'
  | 'faq'
  | 'digitalService'
  | 'institutionalMembership'
  | 'dashboardReport'
  | 'gallery'
  | 'video';

/** The mixin columns every publishable model exposes (camelCase, per schema `@map`). */
interface MixinDelegate {
  findMany(args: unknown): Promise<Array<{ id: string; highlightType?: string | null }>>;
  update(args: unknown): Promise<{ id: string }>;
}

/** Resolve a Prisma model delegate by its typed name. */
function delegate(model: MixinModelName, db: PrismaClient | Prisma.TransactionClient = prisma): MixinDelegate {
  return (db as unknown as Record<MixinModelName, MixinDelegate>)[model];
}

/**
 * Records DUE for scheduled publishing: still drafts (deliberately unpublished content is left
 * alone — only `draft` is auto-promoted) whose `publish_start_at` has arrived. Ordered oldest-due
 * first and bounded by `take`. Returns ids only; the owning service performs the publish so all
 * publish rules + audit are reused. Idempotent: once published the row no longer matches.
 */
export async function findDueForPublish(
  model: MixinModelName,
  now: Date,
  take: number,
): Promise<string[]> {
  const rows = await delegate(model).findMany({
    where: { publicationState: 'draft', publishStartAt: { not: null, lte: now } },
    select: { id: true },
    orderBy: { publishStartAt: 'asc' },
    take,
  });
  return rows.map((r) => r.id);
}

/** A record whose highlight label has expired. */
export interface ExpiredHighlight {
  id: string;
  highlightType: string | null;
}

/**
 * Records whose highlight label has EXPIRED: `highlight_type` is set and `highlight_end_at` has
 * passed. Idempotent: clearing nulls `highlight_type`, so a cleared row never matches again.
 */
export async function findExpiredHighlights(
  model: MixinModelName,
  now: Date,
  take: number,
): Promise<ExpiredHighlight[]> {
  const rows = (await delegate(model).findMany({
    where: { highlightType: { not: null }, highlightEndAt: { not: null, lte: now } },
    select: { id: true, highlightType: true },
    orderBy: { highlightEndAt: 'asc' },
    take,
  })) as ExpiredHighlight[];
  return rows;
}

/**
 * Clear an expired highlight label: null `highlight_type` and its window. Publication state is
 * NEVER touched, so the record stays exactly as published/visible as before — only the badge goes.
 * Runs inside a transaction so the row write is atomic (single-row, but keeps the contract that
 * every background mutation is transactional).
 */
export async function clearHighlight(model: MixinModelName, id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await delegate(model, tx).update({
      where: { id },
      data: { highlightType: null, highlightStartAt: null, highlightEndAt: null },
      select: { id: true },
    });
  });
}

/**
 * Resolve the system actor used by background jobs: the oldest active Super Admin. Jobs execute as
 * a real, authorized identity so `created_by`/`updated_by`, audit attribution and the service-layer
 * state guards all behave exactly as for an HTTP Super Admin (jobs must NOT bypass business
 * validation, Phase 14). Returns null when no Super Admin exists yet (unseeded DB) — the scheduler
 * then skips with a clear warning rather than mutating data anonymously.
 */
export async function findSystemActorId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { isActive: true, userRoles: { some: { role: { key: ROLE_KEYS.superAdmin } } } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return user?.id ?? null;
}

export const schedulerRepository = {
  findDueForPublish,
  findExpiredHighlights,
  clearHighlight,
  findSystemActorId,
};
