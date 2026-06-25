/** Unit tests — institution buildWhere + validators. DB-free. */
import { describe, it, expect } from 'vitest';
import { buildWhere } from './institutions.repository';
import { validateInstitutionCreate } from './institutions.validators';
import { ValidationError } from '@/shared/errors';

const UUID = '44444444-4444-4444-8444-444444444444';

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
