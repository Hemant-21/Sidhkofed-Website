/** Unit tests — event status derivation (CMS requirements §4.1). Pure, DB-free. */
import { describe, it, expect } from 'vitest';
import { deriveEventStatus, canCompleteEvent, canCancelEvent } from './events.status';

const d = (s: string): Date => new Date(`${s}T00:00:00Z`);

describe('deriveEventStatus', () => {
  it('is scheduled before the start date', () => {
    expect(
      deriveEventStatus({ startDate: d('2026-07-10'), endDate: d('2026-07-12'), statusOverride: false, manualStatus: 'scheduled', now: d('2026-07-01') }),
    ).toBe('scheduled');
  });

  it('is ongoing between start and end (inclusive)', () => {
    expect(
      deriveEventStatus({ startDate: d('2026-07-10'), endDate: d('2026-07-12'), statusOverride: false, manualStatus: 'scheduled', now: d('2026-07-11') }),
    ).toBe('ongoing');
    // boundary days are inclusive
    expect(
      deriveEventStatus({ startDate: d('2026-07-10'), endDate: d('2026-07-12'), statusOverride: false, manualStatus: 'scheduled', now: d('2026-07-10') }),
    ).toBe('ongoing');
    expect(
      deriveEventStatus({ startDate: d('2026-07-10'), endDate: d('2026-07-12'), statusOverride: false, manualStatus: 'scheduled', now: d('2026-07-12') }),
    ).toBe('ongoing');
  });

  it('is completed after the end date', () => {
    expect(
      deriveEventStatus({ startDate: d('2026-07-10'), endDate: d('2026-07-12'), statusOverride: false, manualStatus: 'scheduled', now: d('2026-07-13') }),
    ).toBe('completed');
  });

  it('single-date event is ongoing on the day and completed afterwards', () => {
    expect(
      deriveEventStatus({ startDate: d('2026-07-10'), endDate: null, statusOverride: false, manualStatus: 'scheduled', now: d('2026-07-10') }),
    ).toBe('ongoing');
    expect(
      deriveEventStatus({ startDate: d('2026-07-10'), endDate: null, statusOverride: false, manualStatus: 'scheduled', now: d('2026-07-11') }),
    ).toBe('completed');
  });

  it('honours a manual override (postponed/cancelled) regardless of dates', () => {
    expect(
      deriveEventStatus({ startDate: d('2026-07-10'), endDate: null, statusOverride: true, manualStatus: 'cancelled', now: d('2026-07-20') }),
    ).toBe('cancelled');
    expect(
      deriveEventStatus({ startDate: d('2026-07-10'), endDate: null, statusOverride: true, manualStatus: 'postponed', now: d('2026-07-01') }),
    ).toBe('postponed');
  });
});

// Issue 5 — explicit complete / cancel workflow rules.
describe('canCompleteEvent', () => {
  it('allows completing an in-flight event (not completed, not cancelled)', () => {
    expect(canCompleteEvent('scheduled', false)).toBe(true);
    expect(canCompleteEvent('ongoing', false)).toBe(true);
    expect(canCompleteEvent('postponed', false)).toBe(true);
    // a date-derived "completed" event with no explicit completion may still be completed
    expect(canCompleteEvent('completed', false)).toBe(true);
  });
  it('rejects completing an already-completed event', () => {
    expect(canCompleteEvent('ongoing', true)).toBe(false);
  });
  it('rejects completing a cancelled event', () => {
    expect(canCompleteEvent('cancelled', false)).toBe(false);
  });
});

describe('canCancelEvent', () => {
  it('allows cancelling an in-flight event (not cancelled, not completed)', () => {
    expect(canCancelEvent('scheduled', false)).toBe(true);
    expect(canCancelEvent('ongoing', false)).toBe(true);
    expect(canCancelEvent('postponed', false)).toBe(true);
  });
  it('rejects cancelling an explicitly completed event', () => {
    expect(canCancelEvent('completed', true)).toBe(false);
  });
  it('rejects cancelling an already-cancelled event', () => {
    expect(canCancelEvent('cancelled', false)).toBe(false);
  });
});
