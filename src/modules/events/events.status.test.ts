/** Unit tests — event status derivation (CMS requirements §4.1). Pure, DB-free. */
import { describe, it, expect } from 'vitest';
import { deriveEventStatus } from './events.status';

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
