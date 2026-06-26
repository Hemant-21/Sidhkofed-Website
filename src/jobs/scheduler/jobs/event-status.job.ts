/**
 * Event-status recompute (Phase 14 lifecycle automation).
 *
 * Advances the date-derived `event_status` (scheduled → ongoing → completed) for automatic-status
 * events as time passes. Delegates entirely to `eventService.recomputeScheduledStatuses`, which
 * reuses the single date→status rule (events.status.ts) and audits each change — no status logic
 * lives here. Override (postponed/cancelled) and explicitly-completed events are never touched.
 *
 * This is the lifecycle counterpart to scheduled publishing: the schema/docs both name a
 * "scheduled recompute job", and it keeps stored status (used by listings/filters) consistent with
 * the calendar without an editor action.
 */
import { eventService } from '@/modules/events/events.service';
import { emptyResult, type JobContext, type JobRunResult } from '../scheduler.types';

export interface EventStatusDeps {
  recompute: typeof eventService.recomputeScheduledStatuses;
}

const defaultDeps: EventStatusDeps = {
  recompute: eventService.recomputeScheduledStatuses,
};

export async function runEventStatusRecompute(
  ctx: JobContext,
  deps: EventStatusDeps = defaultDeps,
): Promise<JobRunResult> {
  const result = emptyResult();
  const outcome = await deps.recompute(ctx.actor, ctx.batchSize, ctx.now);

  result.processed = outcome.processed;
  result.success = outcome.updated;
  result.failure = outcome.errors.length;
  result.errors = outcome.errors.map((e) => ({ module: 'event', recordId: e.recordId, message: e.message }));
  result.details = { evaluated: outcome.processed, updated: outcome.updated };
  return result;
}
