/**
 * Unit tests — official-communications buildWhere + validators (incl. date chronology) + list-query
 * key validation. DB-free.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './official-communications.repository';
import { validateOfficialCommunicationCreate } from './official-communications.validators';
import { parseOfficialCommunicationFilters } from './official-communications.query';
import { ValidationError } from '@/shared/errors';

const UUID = '44444444-4444-4444-8444-444444444444';
const DOC = '55555555-5555-4555-8555-555555555555';
const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('official-communications buildWhere', () => {
  it('applies the public predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
    expect(predicate.archivedAt).toBeNull();
  });
  it('resolves communication_type by id-or-slug', () => {
    expect(buildWhere({ communicationType: UUID }, {}).communicationType).toEqual({ id: UUID });
    expect(buildWhere({ communicationType: 'notice' }, {}).communicationType).toEqual({ slug: 'notice' });
  });
  it('filters by highlight type and a publication year (issue_date range)', () => {
    expect(buildWhere({ highlight: 'urgent' }, {}).highlightType).toBe('urgent');
    const where = buildWhere({ year: 2026 }, {});
    expect(where.issueDate).toEqual({
      gte: new Date(Date.UTC(2026, 0, 1)),
      lte: new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999)),
    });
  });
});

describe('validateOfficialCommunicationCreate', () => {
  it('accepts a minimal communication', () => {
    const out = validateOfficialCommunicationCreate({ title_en: 'Notice 1', communication_type_id: UUID });
    expect(out.title_en).toBe('Notice 1');
  });
  it('accepts a linked document and chronological dates', () => {
    const out = validateOfficialCommunicationCreate({
      title_en: 'Notice 1',
      communication_type_id: UUID,
      document_id: DOC,
      issue_date: '2026-01-01',
      effective_date: '2026-01-05',
      expiry_date: '2026-02-01',
    });
    expect(out.document_id).toBe(DOC);
  });
  it('rejects effective_date before issue_date', () => {
    expect(() =>
      validateOfficialCommunicationCreate({
        title_en: 'X',
        communication_type_id: UUID,
        issue_date: '2026-02-01',
        effective_date: '2026-01-01',
      }),
    ).toThrow(ValidationError);
  });
  it('rejects expiry_date before effective_date', () => {
    expect(() =>
      validateOfficialCommunicationCreate({
        title_en: 'X',
        communication_type_id: UUID,
        effective_date: '2026-02-01',
        expiry_date: '2026-01-01',
      }),
    ).toThrow(ValidationError);
  });
  it('rejects a bad highlight window', () => {
    expect(() =>
      validateOfficialCommunicationCreate({
        title_en: 'X',
        communication_type_id: UUID,
        highlight_start_at: '2026-02-01T00:00:00.000Z',
        highlight_end_at: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow(ValidationError);
  });
  it('rejects unknown keys and a missing required field', () => {
    expect(() => validateOfficialCommunicationCreate({ title_en: 'X', communication_type_id: UUID, foo: 1 })).toThrow(
      ValidationError,
    );
    expect(() => validateOfficialCommunicationCreate({ title_en: 'X' })).toThrow(ValidationError);
  });
});

describe('parseOfficialCommunicationFilters — unknown filter validation', () => {
  it('accepts known public filters', () => {
    const f = parseOfficialCommunicationFilters(
      reqWith({ communication_type: 'notice', highlight: 'new', year: '2026', show_on_homepage: 'true' }),
      { admin: false },
    );
    expect(f.communicationType).toBe('notice');
    expect(f.highlight).toBe('new');
    expect(f.year).toBe(2026);
    expect(f.showOnHomepage).toBe(true);
  });
  it('rejects an invalid highlight value', () => {
    expect(() => parseOfficialCommunicationFilters(reqWith({ highlight: 'bogus' }), { admin: false })).toThrow(
      ValidationError,
    );
  });
  it('rejects publication_state on the PUBLIC surface (admin-only key)', () => {
    expect(() => parseOfficialCommunicationFilters(reqWith({ publication_state: 'draft' }), { admin: false })).toThrow(
      ValidationError,
    );
  });
  it('rejects an unknown filter with 422', () => {
    expect(() => parseOfficialCommunicationFilters(reqWith({ bogus: '1' }), { admin: true })).toThrow(ValidationError);
  });
});
