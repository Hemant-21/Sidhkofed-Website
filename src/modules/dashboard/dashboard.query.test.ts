/**
 * Unit tests — dashboard query validation (Issue 4). Public + admin list/read endpoints must only
 * accept documented filters/ordering; anything else is a 422. Reuses the shared list-query helpers
 * (assertKnownQueryKeys / resolveOrdering) — no duplicated validation.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { ValidationError } from '@/shared/errors';
import {
  parsePublicDashboardFilters,
  parseMetricFilters,
  parseMetricOrdering,
  parseDatasetFilters,
} from './dashboard.query';

const req = (query: Record<string, unknown>): Request => ({ query }) as unknown as Request;

describe('parsePublicDashboardFilters', () => {
  it('rejects an unknown filter with 422', () => {
    expect(() => parsePublicDashboardFilters(req({ foo: 'bar' }))).toThrow(ValidationError);
  });
  it('accepts the documented financial_year / reporting_period filters', () => {
    const f = parsePublicDashboardFilters(req({ financial_year: 'fy-1', reporting_period: 'rp-1' }));
    expect(f.financialYear).toBe('fy-1');
    expect(f.reportingPeriod).toBe('rp-1');
  });
});

describe('parseMetricFilters / ordering', () => {
  it('rejects an unknown filter key with 422', () => {
    expect(() => parseMetricFilters(req({ wat: '1' }))).toThrow(ValidationError);
  });
  it('rejects an out-of-allow-list source enum', () => {
    expect(() => parseMetricFilters(req({ source: 'api' }))).toThrow(ValidationError);
  });
  it('rejects an invalid ordering field', () => {
    expect(() => parseMetricOrdering(req({ ordering: 'bogus' }))).toThrow(ValidationError);
  });
  it('accepts a documented descending ordering', () => {
    expect(parseMetricOrdering(req({ ordering: '-created_at' }))).toEqual({
      field: 'created_at',
      direction: 'desc',
    });
  });
});

describe('parseDatasetFilters', () => {
  it('rejects an invalid status enum', () => {
    expect(() => parseDatasetFilters(req({ status: 'weird' }))).toThrow(ValidationError);
  });
  it('accepts documented source + status filters', () => {
    const f = parseDatasetFilters(req({ source: 'excel', status: 'processed' }));
    expect(f.source).toBe('excel');
    expect(f.status).toBe('processed');
  });
});
