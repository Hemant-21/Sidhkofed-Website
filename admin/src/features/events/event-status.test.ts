import { describe, expect, it } from 'vitest';
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, EVENT_STATUS_OPTIONS } from './event-status';
import type { EventStatus } from './types';

const ALL: EventStatus[] = ['scheduled', 'ongoing', 'completed', 'postponed', 'cancelled'];

describe('event status presentation', () => {
  it('labels the stored `scheduled` enum as "Upcoming" (reconciliation C1)', () => {
    expect(EVENT_STATUS_LABEL.scheduled).toBe('Upcoming');
  });

  it('defines a label + tone for every backend status', () => {
    for (const s of ALL) {
      expect(EVENT_STATUS_LABEL[s]).toBeTruthy();
      expect(EVENT_STATUS_TONE[s]).toBeTruthy();
    }
  });

  it('exposes filter options covering exactly the backend status set', () => {
    expect(EVENT_STATUS_OPTIONS.map((o) => o.value).sort()).toEqual([...ALL].sort());
  });

  it('uses danger tone for cancelled and warning for postponed', () => {
    expect(EVENT_STATUS_TONE.cancelled).toBe('danger');
    expect(EVENT_STATUS_TONE.postponed).toBe('warning');
  });
});
