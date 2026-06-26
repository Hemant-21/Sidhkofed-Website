/**
 * Job 1 — Scheduled Publishing (Phase 14).
 *
 * Automatically publishes records whose `publish_start_at` has become due. Reuses each module's
 * existing publish service (`service.lifecycle(id,'publish',ctx)`) via the registry, so publish
 * validation of required public fields, `published_at` handling, audit logging and public-cache
 * invalidation are all the existing behaviour — no publish logic is duplicated here.
 *
 * Scope: only `draft` records are auto-promoted (deliberately unpublished content is never
 * resurrected by an old schedule). Idempotent: a published row no longer matches the due query, so
 * a re-run is a no-op. Per-record failures (e.g. a draft still missing required public fields) are
 * captured and the job continues with the rest; that record is retried on the next tick once fixed.
 */
import { logger } from '@/shared/logger';
import { PUBLISHABLE_RESOURCES, type PublishableResource } from '../publishable.registry';
import { schedulerRepository } from '../scheduler.repository';
import { emptyResult, type JobContext, type JobRunResult } from '../scheduler.types';

const log = logger.child({ component: 'scheduler', job: 'scheduled-publishing' });

export interface ScheduledPublishingDeps {
  resources: readonly PublishableResource[];
  findDue: typeof schedulerRepository.findDueForPublish;
}

const defaultDeps: ScheduledPublishingDeps = {
  resources: PUBLISHABLE_RESOURCES,
  findDue: schedulerRepository.findDueForPublish,
};

/** Publish every record whose scheduled start has arrived, across all publishable modules. */
export async function runScheduledPublishing(
  ctx: JobContext,
  deps: ScheduledPublishingDeps = defaultDeps,
): Promise<JobRunResult> {
  const result = emptyResult();
  const perModule: Record<string, number> = {};

  for (const resource of deps.resources) {
    let dueIds: string[];
    try {
      dueIds = await deps.findDue(resource.model, ctx.now, ctx.batchSize);
    } catch (err) {
      // A discovery failure for one module must not abort the others.
      log.error({ err, module: resource.key }, 'failed to query due-for-publish records');
      result.errors.push({ module: resource.key, message: errMessage(err) });
      continue;
    }

    for (const id of dueIds) {
      result.processed += 1;
      try {
        await resource.publish(id, ctx.actor);
        result.success += 1;
        perModule[resource.key] = (perModule[resource.key] ?? 0) + 1;
      } catch (err) {
        result.failure += 1;
        result.errors.push({ module: resource.key, recordId: id, message: errMessage(err) });
        log.warn({ module: resource.key, recordId: id, err }, 'scheduled publish failed; continuing');
      }
    }
  }

  if (Object.keys(perModule).length) result.details = { published_by_module: perModule };
  return result;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
