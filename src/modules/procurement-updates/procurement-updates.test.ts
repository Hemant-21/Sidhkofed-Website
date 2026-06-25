/**
 * Unit tests — procurement-updates buildWhere + validators (rate, period_end≥period_start) +
 * list-query key validation (incl. date_from/date_to). DB-free.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './procurement-updates.repository';
import { validateProcurementUpdateCreate } from './procurement-updates.validators';
import { parseProcurementUpdateFilters } from './procurement-updates.query';
import { ValidationError } from '@/shared/errors';

const UUID = '44444444-4444-4444-8444-444444444444';
const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('procurement-updates buildWhere', () => {
  it('applies the public predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
  });
  it('resolves commodity / district / block / programme / type by id-or-slug', () => {
    expect(buildWhere({ commodity: 'honey' }, {}).commodity).toEqual({ slug: 'honey' });
    expect(buildWhere({ district: UUID }, {}).district).toEqual({ id: UUID });
    expect(buildWhere({ block: 'bishunpur' }, {}).block).toEqual({ slug: 'bishunpur' });
    expect(buildWhere({ programme: 'mfp-2026' }, {}).programmeScheme).toEqual({ slug: 'mfp-2026' });
    expect(buildWhere({ procurementUpdateType: 'rate' }, {}).procurementUpdateType).toEqual({ slug: 'rate' });
  });
  it('builds an effective_date range from date_from/date_to and from year', () => {
    const from = new Date(Date.UTC(2026, 0, 1));
    const to = new Date(Date.UTC(2026, 5, 30));
    expect(buildWhere({ dateFrom: from, dateTo: to }, {}).effectiveDate).toEqual({ gte: from, lte: to });
    expect(buildWhere({ year: 2026 }, {}).effectiveDate).toEqual({
      gte: new Date(Date.UTC(2026, 0, 1)),
      lte: new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999)),
    });
  });
});

describe('validateProcurementUpdateCreate', () => {
  it('accepts a minimal update', () => {
    const out = validateProcurementUpdateCreate({ title_en: 'Honey rate', procurement_update_type_id: UUID });
    expect(out.title_en).toBe('Honey rate');
  });
  it('accepts conditional rate/unit/location/period fields', () => {
    const out = validateProcurementUpdateCreate({
      title_en: 'Honey rate',
      procurement_update_type_id: UUID,
      rate: 250.5,
      unit: 'per kg',
      location_text: 'Gumla centre',
      period_start: '2026-01-01',
      period_end: '2026-03-31',
    });
    expect(out.rate).toBe(250.5);
  });
  it('rejects a negative rate', () => {
    expect(() =>
      validateProcurementUpdateCreate({ title_en: 'X', procurement_update_type_id: UUID, rate: -5 }),
    ).toThrow(ValidationError);
  });
  it('rejects period_end before period_start', () => {
    expect(() =>
      validateProcurementUpdateCreate({
        title_en: 'X',
        procurement_update_type_id: UUID,
        period_start: '2026-03-01',
        period_end: '2026-01-01',
      }),
    ).toThrow(ValidationError);
  });
  it('rejects unknown keys', () => {
    expect(() => validateProcurementUpdateCreate({ title_en: 'X', procurement_update_type_id: UUID, foo: 1 })).toThrow(
      ValidationError,
    );
  });
});

describe('parseProcurementUpdateFilters — unknown filter validation', () => {
  it('accepts known public filters incl. date range', () => {
    const f = parseProcurementUpdateFilters(
      reqWith({ commodity: 'honey', district: 'gumla', date_from: '2026-01-01', date_to: '2026-06-30' }),
      { admin: false },
    );
    expect(f.commodity).toBe('honey');
    expect(f.dateFrom).toEqual(new Date('2026-01-01T00:00:00Z'));
  });
  it('rejects a malformed date_from', () => {
    expect(() => parseProcurementUpdateFilters(reqWith({ date_from: '01-2026' }), { admin: false })).toThrow(
      ValidationError,
    );
  });
  it('rejects publication_state on the PUBLIC surface', () => {
    expect(() => parseProcurementUpdateFilters(reqWith({ publication_state: 'draft' }), { admin: false })).toThrow(
      ValidationError,
    );
  });
});
