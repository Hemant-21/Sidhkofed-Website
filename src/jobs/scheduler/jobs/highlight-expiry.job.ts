/**
 * Job 2 — Highlight Expiry (Phase 14).
 *
 * Removes the `highlight_type` label once `highlight_end_at` has passed. Per CMS requirements §9
 * and API spec §3, expiry clears ONLY the badge — it never unpublishes, archives or otherwise
 * changes the record's lifecycle. The clear is a single-row transactional maintenance write
 * (scheduler.repository.clearHighlight, which only nulls the highlight columns) and every clear is
 * recorded through the shared audit service, so the change is fully attributable to the system
 * actor without any publishing-state side effect.
 *
 * Idempotent: clearing nulls `highlight_type`, so a cleared row never matches the expired query
 * again. Per-record failures are captured and the job continues.
 */
import { logger } from '@/shared/logger';
import { auditService } from '@/modules/audit/audit.service';
import { PUBLISHABLE_RESOURCES, type PublishableResource } from '../publishable.registry';
import { schedulerRepository } from '../scheduler.repository';
import { emptyResult, type JobContext, type JobRunResult } from '../scheduler.types';

const log = logger.child({ component: 'scheduler', job: 'highlight-expiry' });

export interface HighlightExpiryDeps {
  resources: readonly PublishableResource[];
  findExpired: typeof schedulerRepository.findExpiredHighlights;
  clear: typeof schedulerRepository.clearHighlight;
  audit: typeof auditService.log;
}

const defaultDeps: HighlightExpiryDeps = {
  resources: PUBLISHABLE_RESOURCES,
  findExpired: schedulerRepository.findExpiredHighlights,
  clear: schedulerRepository.clearHighlight,
  audit: auditService.log,
};

/** Clear every expired highlight label across all highlightable modules. */
export async function runHighlightExpiry(
  ctx: JobContext,
  deps: HighlightExpiryDeps = defaultDeps,
): Promise<JobRunResult> {
  const result = emptyResult();
  const perModule: Record<string, number> = {};

  for (const resource of deps.resources) {
    let expired: Awaited<ReturnType<typeof schedulerRepository.findExpiredHighlights>>;
    try {
      expired = await deps.findExpired(resource.model, ctx.now, ctx.batchSize);
    } catch (err) {
      log.error({ err, module: resource.key }, 'failed to query expired highlights');
      result.errors.push({ module: resource.key, message: errMessage(err) });
      continue;
    }

    for (const row of expired) {
      result.processed += 1;
      try {
        await deps.clear(resource.model, row.id);
        await deps.audit('UPDATE', ctx.actor, {
          module: resource.key,
          recordId: row.id,
          summary: 'HIGHLIGHT_EXPIRED',
          oldValues: { highlight_type: row.highlightType },
          newValues: { highlight_type: null },
        });
        result.success += 1;
        perModule[resource.key] = (perModule[resource.key] ?? 0) + 1;
      } catch (err) {
        result.failure += 1;
        result.errors.push({ module: resource.key, recordId: row.id, message: errMessage(err) });
        log.warn({ module: resource.key, recordId: row.id, err }, 'highlight clear failed; continuing');
      }
    }
  }

  if (Object.keys(perModule).length) result.details = { cleared_by_module: perModule };
  return result;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
