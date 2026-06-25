/**
 * Event status derivation (CMS requirements §4.1).
 *
 * Status is automatically derived from dates UNLESS `status_override = true`, in which case the
 * record holds a manual `postponed` or `cancelled` status that overrides the date calculation.
 *
 *   before start_date                         → scheduled  (public UI may label "Upcoming")
 *   between start_date and end_date (incl.)    → ongoing
 *   after end_date                             → completed
 *   single-date event: ongoing on the day, completed afterwards
 *
 * `completed` here is the *date-derived* completed state. The explicit "Complete" action
 * (events.service.complete) is a separate, deliberate step that also captures outcome fields and
 * is guarded against duplicate completion; it sets the same enum value but via an audited action.
 */
import type { EventStatus } from '@prisma/client';

/** Truncate a Date to its UTC calendar day (events use DATE columns — time-of-day is irrelevant). */
function utcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export interface DeriveInput {
  startDate: Date;
  endDate: Date | null;
  statusOverride: boolean;
  /** The current manual status when override is on (postponed | cancelled). */
  manualStatus: EventStatus;
  now?: Date;
}

/**
 * Resolve the effective auto-status from dates. When `statusOverride` is true the manual status is
 * preserved unchanged (postponed/cancelled never get recomputed). The single source of the
 * date→status rule, reused by create, update, and the scheduled recompute job.
 */
export function deriveEventStatus(input: DeriveInput): EventStatus {
  if (input.statusOverride) return input.manualStatus;
  const today = utcDay(input.now ?? new Date());
  const start = utcDay(input.startDate);
  const end = input.endDate ? utcDay(input.endDate) : start;
  if (today < start) return 'scheduled';
  if (today > end) return 'completed';
  return 'ongoing';
}

/** Manual-override statuses are the only values an editor may set directly (API spec §6). */
export const MANUAL_OVERRIDE_STATUSES = ['postponed', 'cancelled'] as const;
export type ManualOverrideStatus = (typeof MANUAL_OVERRIDE_STATUSES)[number];
