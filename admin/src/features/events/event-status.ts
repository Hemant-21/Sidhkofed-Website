/**
 * Event-status presentation map (pure → unit-testable). The backend DERIVES the status
 * (events.status.ts); the frontend only LABELS it and never recalculates. The codex uses
 * "Upcoming" as the public label for the stored `scheduled` enum (reconciliation C1).
 */

import type { StatusTone } from '@/constants/status';
import type { EventStatus } from './types';

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
  postponed: 'Postponed',
  cancelled: 'Cancelled',
};

export const EVENT_STATUS_TONE: Record<EventStatus, StatusTone> = {
  scheduled: 'info',
  ongoing: 'success',
  completed: 'muted',
  postponed: 'warning',
  cancelled: 'danger',
};

/** Filter dropdown options for event status (matches the backend allow-list). */
export const EVENT_STATUS_OPTIONS: Array<{ value: EventStatus; label: string }> = (
  Object.keys(EVENT_STATUS_LABEL) as EventStatus[]
).map((value) => ({ value, label: EVENT_STATUS_LABEL[value] }));

export const DATE_MODE_LABEL: Record<string, string> = {
  single: 'Single date',
  range: 'Date range',
  multi_day: 'Multi-day',
};
