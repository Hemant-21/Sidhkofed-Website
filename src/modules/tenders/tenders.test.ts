/**
 * Unit tests — tenders buildWhere + validators (gem_url HTTPS, opening≥publish, status enum) +
 * list-query key validation. DB-free.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './tenders.repository';
import { validateTenderCreate } from './tenders.validators';
import { parseTenderFilters } from './tenders.query';
import { ValidationError } from '@/shared/errors';

const UUID = '44444444-4444-4444-8444-444444444444';
const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('tenders buildWhere', () => {
  it('applies the public predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
  });
  it('resolves tender_type by id-or-slug and filters by status', () => {
    expect(buildWhere({ tenderType: 'goods' }, {}).tenderType).toEqual({ slug: 'goods' });
    expect(buildWhere({ tenderStatus: 'open' }, {}).tenderStatus).toBe('open');
  });
  it('filters by year on publish_date', () => {
    const where = buildWhere({ year: 2026 }, {});
    expect(where.publishDate).toEqual({
      gte: new Date(Date.UTC(2026, 0, 1)),
      lte: new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999)),
    });
  });
});

describe('validateTenderCreate', () => {
  it('accepts a minimal tender', () => {
    const out = validateTenderCreate({ title_en: 'Tender 1', tender_type_id: UUID });
    expect(out.title_en).toBe('Tender 1');
  });
  it('accepts a valid HTTPS gem_url and a tender_status', () => {
    const out = validateTenderCreate({
      title_en: 'T',
      tender_type_id: UUID,
      gem_url: 'https://gem.gov.in/tender/123',
      tender_status: 'open',
    });
    expect(out.gem_url).toContain('https://');
  });
  it('rejects a non-HTTPS gem_url (http)', () => {
    expect(() =>
      validateTenderCreate({ title_en: 'T', tender_type_id: UUID, gem_url: 'http://gem.gov.in/x' }),
    ).toThrow(ValidationError);
  });
  it('rejects an invalid tender_status', () => {
    expect(() => validateTenderCreate({ title_en: 'T', tender_type_id: UUID, tender_status: 'bogus' })).toThrow(
      ValidationError,
    );
  });
  it('rejects opening_date before publish_date', () => {
    expect(() =>
      validateTenderCreate({
        title_en: 'T',
        tender_type_id: UUID,
        publish_date: '2026-02-01',
        opening_date: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow(ValidationError);
  });
  it('rejects unknown keys', () => {
    expect(() => validateTenderCreate({ title_en: 'T', tender_type_id: UUID, foo: 1 })).toThrow(ValidationError);
  });
});

describe('parseTenderFilters — unknown filter validation', () => {
  it('accepts known public filters', () => {
    const f = parseTenderFilters(reqWith({ tender_type: 'goods', tender_status: 'open', year: '2026' }), {
      admin: false,
    });
    expect(f.tenderType).toBe('goods');
    expect(f.tenderStatus).toBe('open');
    expect(f.year).toBe(2026);
  });
  it('rejects show_on_homepage on the PUBLIC surface (admin-only key per API spec §5)', () => {
    expect(() => parseTenderFilters(reqWith({ show_on_homepage: 'true' }), { admin: false })).toThrow(ValidationError);
  });
  it('accepts show_on_homepage + publication_state on the ADMIN surface', () => {
    const f = parseTenderFilters(reqWith({ show_on_homepage: 'true', publication_state: 'published' }), {
      admin: true,
    });
    expect(f.showOnHomepage).toBe(true);
    expect(f.publicationState).toBe('published');
  });
  it('rejects an invalid tender_status filter', () => {
    expect(() => parseTenderFilters(reqWith({ tender_status: 'bogus' }), { admin: false })).toThrow(ValidationError);
  });
});
