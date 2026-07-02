import { describe, it, expect } from 'vitest';
import { formatDate, formatDateRange, formatNumber, truncate, humanizeEnum } from './format';

describe('formatDate', () => {
  it('returns empty for null/invalid', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });
  it('formats a valid ISO date', () => {
    expect(formatDate('2026-02-10', 'en')).toMatch(/2026/);
  });
});

describe('formatDateRange', () => {
  it('collapses to a single date when end equals start or is missing', () => {
    expect(formatDateRange('2026-02-10', '2026-02-10', 'en')).toBe(formatDate('2026-02-10', 'en'));
    expect(formatDateRange('2026-02-10', null, 'en')).toBe(formatDate('2026-02-10', 'en'));
  });
  it('renders a range with a dash', () => {
    expect(formatDateRange('2026-02-10', '2026-02-11', 'en')).toContain('–');
  });
});

describe('formatNumber', () => {
  it('formats with Indian locale grouping (lakh/crore)', () => {
    expect(formatNumber(1234567, 'en')).toBe('12,34,567');
  });
  it('returns empty for nullish', () => {
    expect(formatNumber(null)).toBe('');
  });
});

describe('truncate', () => {
  it('keeps short text', () => {
    expect(truncate('short', 100)).toBe('short');
  });
  it('truncates on a word boundary with an ellipsis', () => {
    const out = truncate('one two three four five', 12);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(13);
  });
});

describe('humanizeEnum', () => {
  it('title-cases snake/kebab values', () => {
    expect(humanizeEnum('district_union')).toBe('District Union');
    expect(humanizeEnum('multi_day')).toBe('Multi Day');
    expect(humanizeEnum(null)).toBe('');
  });
});
