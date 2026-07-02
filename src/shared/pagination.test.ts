/** Unit tests — strict pagination validation (remediation Issue 4). */
import { describe, it, expect } from 'vitest';
import { resolvePageParams, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './pagination';
import { ValidationError } from './errors';

describe('resolvePageParams', () => {
  it('defaults when params are absent/empty', () => {
    expect(resolvePageParams(undefined, undefined)).toMatchObject({ page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE });
    expect(resolvePageParams('', '')).toMatchObject({ page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE });
  });

  it('parses valid positive integers', () => {
    expect(resolvePageParams('3', '25')).toMatchObject({ page: 3, pageSize: 25, skip: 50, take: 25 });
  });

  it('clamps page_size above the cap (not an error)', () => {
    expect(resolvePageParams('1', '500')).toMatchObject({ pageSize: MAX_PAGE_SIZE });
  });

  it.each(['abc', '0', '-1', '1.5', '  ', 'NaN'])('rejects malformed page "%s" with 422', (bad) => {
    expect(() => resolvePageParams(bad, undefined)).toThrow(ValidationError);
  });

  it.each(['abc', '0', '-5', '2.2'])('rejects malformed page_size "%s" with 422', (bad) => {
    expect(() => resolvePageParams(undefined, bad)).toThrow(ValidationError);
  });

  it('reports both fields when both are malformed', () => {
    try {
      resolvePageParams('x', 'y');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fields).toHaveProperty('page');
      expect((err as ValidationError).fields).toHaveProperty('page_size');
    }
  });
});
