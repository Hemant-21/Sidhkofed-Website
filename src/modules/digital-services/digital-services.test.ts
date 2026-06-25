/**
 * Unit tests — digital-services buildWhere, validators (external_url HTTPS required), and list-query
 * key validation. DB-free.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './digital-services.repository';
import { validateDigitalServiceCreate, validateDigitalServiceUpdate } from './digital-services.validators';
import { parseDigitalServiceFilters } from './digital-services.query';
import { ValidationError } from '@/shared/errors';

const UUID = '44444444-4444-4444-8444-444444444444';
const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('digital-services buildWhere', () => {
  it('applies the public predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
  });
  it('admin filters by publication_state + show_on_homepage', () => {
    const where = buildWhere({ publicationState: 'draft', showOnHomepage: true }, {});
    expect(where.publicationState).toBe('draft');
    expect(where.showOnHomepage).toBe(true);
  });
});

describe('validateDigitalServiceCreate', () => {
  it('accepts a service with title + HTTPS external_url', () => {
    const out = validateDigitalServiceCreate({ title_en: 'ERP', external_url: 'https://erp.example.gov.in' });
    expect(out.external_url).toContain('https://');
  });
  it('accepts an optional icon_media_id', () => {
    expect(
      validateDigitalServiceCreate({ title_en: 'MIS', external_url: 'https://mis.example', icon_media_id: UUID })
        .icon_media_id,
    ).toBe(UUID);
  });
  it('rejects a missing external_url', () => {
    expect(() => validateDigitalServiceCreate({ title_en: 'ERP' })).toThrow(ValidationError);
  });
  it('rejects a non-HTTPS external_url (http)', () => {
    expect(() => validateDigitalServiceCreate({ title_en: 'ERP', external_url: 'http://erp.example' })).toThrow(
      ValidationError,
    );
  });
  it('rejects a javascript: scheme', () => {
    expect(() =>
      validateDigitalServiceCreate({ title_en: 'ERP', external_url: 'javascript:alert(1)' }),
    ).toThrow(ValidationError);
  });
  it('rejects unknown keys', () => {
    expect(() => validateDigitalServiceCreate({ title_en: 'X', external_url: 'https://a.b', foo: 1 })).toThrow(
      ValidationError,
    );
  });
  it('PATCH keeps external_url HTTPS-validated but optional', () => {
    expect(validateDigitalServiceUpdate({ title_hi: 'x' }).title_hi).toBe('x');
    expect(() => validateDigitalServiceUpdate({ external_url: 'http://x' })).toThrow(ValidationError);
  });
});

describe('parseDigitalServiceFilters', () => {
  it('rejects show_on_homepage on the PUBLIC surface (admin-only)', () => {
    expect(() => parseDigitalServiceFilters(reqWith({ show_on_homepage: 'true' }), { admin: false })).toThrow(
      ValidationError,
    );
  });
  it('accepts admin filters', () => {
    const f = parseDigitalServiceFilters(reqWith({ publication_state: 'published' }), { admin: true });
    expect(f.publicationState).toBe('published');
  });
});
