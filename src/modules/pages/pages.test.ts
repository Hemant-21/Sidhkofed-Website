/**
 * Unit tests — pages buildWhere + validators + list-query key validation. DB-free.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './pages.repository';
import { validatePageCreate, validatePageUpdate } from './pages.validators';
import { parsePageFilters, parsePageOrdering } from './pages.query';
import { ValidationError } from '@/shared/errors';

const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('pages buildWhere', () => {
  it('applies the public visibility predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
    expect(predicate.publicVisibility).toBe(true);
    expect(predicate.archivedAt).toBeNull();
  });
  it('admin query filters by publication_state and show_on_homepage', () => {
    const where = buildWhere({ publicationState: 'draft', showOnHomepage: true }, {});
    expect(where.publicationState).toBe('draft');
    expect(where.showOnHomepage).toBe(true);
  });
  it('search matches title + body case-insensitively', () => {
    const or = (buildWhere({ search: 'vision' }, {}).AND as Array<{ OR: unknown[] }>)[0].OR;
    expect(or).toHaveLength(4);
  });
});

describe('validatePageCreate', () => {
  it('accepts a minimal page (title only)', () => {
    expect(validatePageCreate({ title_en: 'About Us' }).title_en).toBe('About Us');
  });
  it('accepts body + meta override fields', () => {
    const out = validatePageCreate({
      title_en: 'About',
      body_en: '<p>hi</p>',
      meta_title_en: 'About SIDHKOFED',
      meta_description_en: 'desc',
    });
    expect(out.meta_title_en).toBe('About SIDHKOFED');
  });
  it('rejects a missing title', () => {
    expect(() => validatePageCreate({ body_en: 'x' })).toThrow(ValidationError);
  });
  it('rejects a client-supplied slug (server-managed)', () => {
    expect(() => validatePageCreate({ title_en: 'A', slug: 'custom' })).toThrow(ValidationError);
  });
  it('rejects a client-supplied publication_state (server-managed)', () => {
    expect(() => validatePageCreate({ title_en: 'A', publication_state: 'published' })).toThrow(ValidationError);
  });
  it('rejects unknown keys', () => {
    expect(() => validatePageCreate({ title_en: 'A', foo: 1 })).toThrow(ValidationError);
  });
  it('PATCH is partial', () => {
    expect(validatePageUpdate({ title_hi: 'हिंदी' }).title_hi).toBe('हिंदी');
  });
});

describe('parsePageFilters — unknown filter validation', () => {
  it('accepts admin filters', () => {
    const f = parsePageFilters(reqWith({ publication_state: 'published', show_on_homepage: 'true' }));
    expect(f.publicationState).toBe('published');
    expect(f.showOnHomepage).toBe(true);
  });
  it('rejects an unknown filter key', () => {
    expect(() => parsePageFilters(reqWith({ bogus: '1' }))).toThrow(ValidationError);
  });
  it('rejects an unsupported ordering field', () => {
    expect(() => parsePageOrdering(reqWith({ ordering: 'bogus' }))).toThrow(ValidationError);
  });
  it('parses descending ordering', () => {
    expect(parsePageOrdering(reqWith({ ordering: '-published_at' }))).toEqual({
      field: 'published_at',
      direction: 'desc',
    });
  });
});
