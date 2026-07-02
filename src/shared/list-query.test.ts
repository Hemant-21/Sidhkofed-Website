/** Unit tests — shared list-query enum/flag validation (strict 422). */
import { describe, it, expect } from 'vitest';
import { parsePublicationState, parseBooleanFlag, parseSearch, assertKnownQueryKeys } from './list-query';
import { ValidationError } from './errors';

describe('parsePublicationState', () => {
  it('returns undefined when absent/empty', () => {
    expect(parsePublicationState(undefined)).toBeUndefined();
    expect(parsePublicationState('')).toBeUndefined();
  });

  it.each(['draft', 'published', 'unpublished', 'archived'] as const)('accepts the valid value "%s"', (v) => {
    expect(parsePublicationState(v)).toBe(v);
  });

  it.each(['INVALID', 'PUBLISHED', 'live', '123'])('rejects invalid value "%s" with 422', (v) => {
    try {
      parsePublicationState(v);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).statusCode).toBe(422);
      expect((err as ValidationError).fields).toHaveProperty('publication_state');
    }
  });
});

describe('parseBooleanFlag', () => {
  it('parses true/false and undefined', () => {
    expect(parseBooleanFlag('true', 'show_on_homepage')).toBe(true);
    expect(parseBooleanFlag('false', 'show_on_homepage')).toBe(false);
    expect(parseBooleanFlag(undefined, 'show_on_homepage')).toBeUndefined();
  });

  it('rejects a non-boolean value with 422', () => {
    expect(() => parseBooleanFlag('yes', 'show_on_homepage')).toThrow(ValidationError);
  });
});

describe('parseSearch', () => {
  it('trims and returns the term, or undefined when empty', () => {
    expect(parseSearch('  lac ')).toBe('lac');
    expect(parseSearch('')).toBeUndefined();
    expect(parseSearch(undefined)).toBeUndefined();
  });
});

describe('assertKnownQueryKeys', () => {
  it('allows the common pagination/search keys plus declared filters', () => {
    expect(() =>
      assertKnownQueryKeys({ page: '1', page_size: '20', ordering: '-created_at', search: 'x', commodity: 'lac' }, ['commodity']),
    ).not.toThrow();
  });

  it('rejects an unknown parameter with 422 and names it', () => {
    try {
      assertKnownQueryKeys({ commodity: 'lac', bogus: '1' }, ['commodity']);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).statusCode).toBe(422);
      expect((err as ValidationError).fields).toHaveProperty('bogus');
    }
  });

  it('reports every unknown key at once', () => {
    try {
      assertKnownQueryKeys({ foo: '1', bar: '2' }, []);
      throw new Error('should have thrown');
    } catch (err) {
      const fields = (err as ValidationError).fields;
      expect(fields).toHaveProperty('foo');
      expect(fields).toHaveProperty('bar');
    }
  });
});
