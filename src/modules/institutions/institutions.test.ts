/** Unit tests — institution buildWhere + validators + list-query key validation. DB-free. */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './institutions.repository';
import { validateInstitutionCreate } from './institutions.validators';
import { parseInstitutionFilters } from './institutions.query';
import { ValidationError } from '@/shared/errors';

const UUID = '44444444-4444-4444-8444-444444444444';
const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('institutions buildWhere', () => {
  it('applies the public predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
  });
  it('resolves institution_type and district by id-or-slug', () => {
    expect(buildWhere({ institutionType: UUID }, {}).institutionType).toEqual({ id: UUID });
    expect(buildWhere({ district: 'gumla' }, {}).district).toEqual({ slug: 'gumla' });
  });
});

describe('validateInstitutionCreate', () => {
  it('accepts a minimal institution', () => {
    const out = validateInstitutionCreate({ institution_type_id: UUID, name_en: 'JSLPS' });
    expect(out.name_en).toBe('JSLPS');
  });
  it('rejects a non-http website url', () => {
    expect(() => validateInstitutionCreate({ institution_type_id: UUID, name_en: 'X', website_url: 'ftp://x' })).toThrow(ValidationError);
  });
  it('rejects an invalid email', () => {
    expect(() => validateInstitutionCreate({ institution_type_id: UUID, name_en: 'X', contact_email: 'nope' })).toThrow(ValidationError);
  });
  it('rejects unknown keys', () => {
    expect(() => validateInstitutionCreate({ institution_type_id: UUID, name_en: 'X', foo: 1 })).toThrow(ValidationError);
  });
});

describe('parseInstitutionFilters — unknown filter validation (Issue 5)', () => {
  it('accepts known public filters', () => {
    const f = parseInstitutionFilters(reqWith({ institution_type: 'partner', district: 'gumla', show_on_homepage: 'true' }), {
      admin: false,
    });
    expect(f.institutionType).toBe('partner');
    expect(f.district).toBe('gumla');
    expect(f.showOnHomepage).toBe(true);
  });

  it('accepts known admin filters incl. publication_state', () => {
    const f = parseInstitutionFilters(reqWith({ publication_state: 'draft', search: 'jslps' }), { admin: true });
    expect(f.publicationState).toBe('draft');
    expect(f.search).toBe('jslps');
  });

  it('rejects an unknown public filter with 422', () => {
    expect(() => parseInstitutionFilters(reqWith({ bogus: '1' }), { admin: false })).toThrow(ValidationError);
  });

  it('rejects an unknown admin filter with 422', () => {
    expect(() => parseInstitutionFilters(reqWith({ region: 'x' }), { admin: true })).toThrow(ValidationError);
  });

  it('rejects publication_state on the PUBLIC surface (admin-only key)', () => {
    expect(() => parseInstitutionFilters(reqWith({ publication_state: 'draft' }), { admin: false })).toThrow(ValidationError);
  });

  it('reports every offending key when valid and invalid are mixed', () => {
    try {
      parseInstitutionFilters(reqWith({ district: 'gumla', foo: '1', bar: '2' }), { admin: true });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const fields = (err as ValidationError).fields;
      expect(fields).toHaveProperty('foo');
      expect(fields).toHaveProperty('bar');
      expect(fields).not.toHaveProperty('district');
    }
  });
});
