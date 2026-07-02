/**
 * Unit tests — search request validation (Phase 13). Pure, DB-free. Covers query-length bounds,
 * the content_type allow-list, year validation, and rejection of unsupported parameters.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { parseSearchFilters } from './search.validators';
import { CONTENT_TYPES } from './search.types';
import { ValidationError } from '@/shared/errors';

const req = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('parseSearchFilters — query term', () => {
  it('requires q', () => {
    expect(() => parseSearchFilters(req({}))).toThrow(ValidationError);
  });

  it('rejects a query shorter than 2 characters', () => {
    expect(() => parseSearchFilters(req({ q: 'a' }))).toThrow(ValidationError);
  });

  it('rejects a query longer than 120 characters', () => {
    expect(() => parseSearchFilters(req({ q: 'x'.repeat(121) }))).toThrow(ValidationError);
  });

  it('accepts a valid query and trims it', () => {
    expect(parseSearchFilters(req({ q: '  lac  ' })).q).toBe('lac');
  });
});

describe('parseSearchFilters — content_type', () => {
  it('defaults to every searchable surface when omitted', () => {
    expect(parseSearchFilters(req({ q: 'lac' })).contentTypes).toEqual([...CONTENT_TYPES]);
  });

  it('parses a comma-separated subset', () => {
    expect(parseSearchFilters(req({ q: 'lac', content_type: 'event,document' })).contentTypes).toEqual([
      'event',
      'document',
    ]);
  });

  it('de-duplicates repeated content types', () => {
    expect(parseSearchFilters(req({ q: 'lac', content_type: 'event,event' })).contentTypes).toEqual(['event']);
  });

  it('rejects an unknown content type with 422', () => {
    expect(() => parseSearchFilters(req({ q: 'lac', content_type: 'event,faq' }))).toThrow(ValidationError);
  });
});

describe('parseSearchFilters — filters & unknown params', () => {
  it('passes through relational filters', () => {
    const f = parseSearchFilters(req({ q: 'lac', commodity: 'lac', district: 'gumla', programme: 'mfp-2026' }));
    expect(f).toMatchObject({ commodity: 'lac', district: 'gumla', programme: 'mfp-2026' });
  });

  it('parses a valid year and rejects an invalid one', () => {
    expect(parseSearchFilters(req({ q: 'lac', year: '2026' })).year).toBe(2026);
    expect(() => parseSearchFilters(req({ q: 'lac', year: 'soon' }))).toThrow(ValidationError);
  });

  it('rejects an unsupported search parameter', () => {
    expect(() => parseSearchFilters(req({ q: 'lac', ordering: '-rank' }))).toThrow(ValidationError);
  });
});
