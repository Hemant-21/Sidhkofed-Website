/** Unit tests — programme buildWhere + validators. DB-free. */
import { describe, it, expect } from 'vitest';
import { buildWhere } from './programmes.repository';
import { validateProgrammeCreate } from './programmes.validators';
import { ValidationError } from '@/shared/errors';

describe('programmes buildWhere', () => {
  it('applies the public predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
  });
  it('filters commodity by id-or-slug via the junction', () => {
    expect(buildWhere({ commodity: 'lac' }, {}).commodities).toEqual({ some: { commodity: { slug: 'lac' } } });
  });
  it('builds a start_date range from year', () => {
    const range = buildWhere({ year: 2026 }, {}).startDate as { gte: Date; lte: Date };
    expect(range.gte.getUTCFullYear()).toBe(2026);
  });
});

describe('validateProgrammeCreate', () => {
  it('accepts a minimal programme', () => {
    expect(validateProgrammeCreate({ title_en: 'MFP Value Chain' }).title_en).toBe('MFP Value Chain');
  });
  it('rejects an end_date before start_date', () => {
    expect(() => validateProgrammeCreate({ title_en: 'X', start_date: '2026-07-15', end_date: '2026-07-01' })).toThrow(ValidationError);
  });
  it('rejects unknown keys', () => {
    expect(() => validateProgrammeCreate({ title_en: 'X', foo: 1 })).toThrow(ValidationError);
  });
});
