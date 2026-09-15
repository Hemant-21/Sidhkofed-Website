/**
 * Unit tests — generate-request validation. Pure (no DB): filters are checked against the
 * registry's `supportedFilters` for the named report.
 */
import { describe, it, expect } from 'vitest';
import { validateGenerateBody } from './operational-reports.validators';

const VALID_UUID = '11111111-1111-1111-1111-111111111111';

describe('validateGenerateBody', () => {
  it('accepts a well-formed body with supported filters', () => {
    const result = validateGenerateBody('event_activity_outcomes', {
      periodInput: { mode: 'fixed_range', startDate: '2025-04-01', endDate: '2025-06-30' },
      filters: { districtId: [VALID_UUID] },
    });
    expect(result.filters.districtId).toEqual([VALID_UUID]);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it('rejects a filter key not supported by the report', () => {
    expect(() =>
      validateGenerateBody('event_activity_outcomes', {
        periodInput: { mode: 'fixed_range', startDate: '2025-04-01', endDate: '2025-06-30' },
        filters: { commodityId: [VALID_UUID] },
      }),
    ).toThrow();
  });

  it('rejects a non-UUID value for a master-data filter', () => {
    expect(() =>
      validateGenerateBody('event_activity_outcomes', {
        periodInput: { mode: 'fixed_range', startDate: '2025-04-01', endDate: '2025-06-30' },
        filters: { districtId: ['not-a-uuid'] },
      }),
    ).toThrow();
  });

  it('accepts a free-text eventStatus filter value', () => {
    const result = validateGenerateBody('event_activity_outcomes', {
      periodInput: { mode: 'fixed_range', startDate: '2025-04-01', endDate: '2025-06-30' },
      filters: { eventStatus: ['completed'] },
    });
    expect(result.filters.eventStatus).toEqual(['completed']);
  });

  it('rejects an unknown report key', () => {
    expect(() =>
      validateGenerateBody('not_a_report', {
        periodInput: { mode: 'fixed_range', startDate: '2025-04-01', endDate: '2025-06-30' },
      }),
    ).toThrow();
  });
});
