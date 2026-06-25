/** Unit tests — document validators (TASK 15 validation rules). */
import { describe, it, expect } from 'vitest';
import { ValidationError } from '@/shared/errors';
import { validateDocumentCreate, validateDocumentUpdate, validateReplaceFile } from './documents.validators';

const TYPE = '11111111-1111-4111-8111-111111111111';
const ASSET = '22222222-2222-4222-8222-222222222222';
const CAT = '33333333-3333-4333-8333-333333333333';

function tryCreate(body: Record<string, unknown>): ValidationError | null {
  try {
    validateDocumentCreate(body);
    return null;
  } catch (err) {
    return err as ValidationError;
  }
}

describe('validateDocumentCreate', () => {
  it('accepts a minimal valid document and coerces the date', () => {
    const out = validateDocumentCreate({
      title_en: 'Annual Report',
      document_type_id: TYPE,
      file_asset_id: ASSET,
      publication_date: '2026-05-01',
    });
    expect(out.title_en).toBe('Annual Report');
    expect(out.publication_date).toBeInstanceOf(Date);
    expect((out.publication_date as Date).toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('requires title_en, document_type_id, and file_asset_id', () => {
    const err = tryCreate({});
    expect(err).toBeInstanceOf(ValidationError);
    expect(err?.fields).toHaveProperty('title_en');
    expect(err?.fields).toHaveProperty('document_type_id');
    expect(err?.fields).toHaveProperty('file_asset_id');
  });

  it('rejects show_in_knowledge_centre=true without a knowledge category', () => {
    const err = tryCreate({ title_en: 'X', document_type_id: TYPE, file_asset_id: ASSET, show_in_knowledge_centre: true });
    expect(err?.fields).toHaveProperty('knowledge_category_id');
  });

  it('accepts show_in_knowledge_centre=true with a category', () => {
    const out = validateDocumentCreate({
      title_en: 'X', document_type_id: TYPE, file_asset_id: ASSET,
      show_in_knowledge_centre: true, knowledge_category_id: CAT,
    });
    expect(out.show_in_knowledge_centre).toBe(true);
  });

  it('rejects an invalid publication_date format', () => {
    const err = tryCreate({ title_en: 'X', document_type_id: TYPE, file_asset_id: ASSET, publication_date: '01-05-2026' });
    expect(err?.fields).toHaveProperty('publication_date');
  });

  it('rejects a non-UUID document_type_id', () => {
    const err = tryCreate({ title_en: 'X', document_type_id: 'not-a-uuid', file_asset_id: ASSET });
    expect(err?.fields).toHaveProperty('document_type_id');
  });

  it('rejects unknown/server-managed fields (strict)', () => {
    const err = tryCreate({ title_en: 'X', document_type_id: TYPE, file_asset_id: ASSET, publication_state: 'published' });
    expect(err).toBeInstanceOf(ValidationError);
  });

  it('rejects a highlight window where end precedes start', () => {
    const err = tryCreate({
      title_en: 'X', document_type_id: TYPE, file_asset_id: ASSET,
      highlight_type: 'new', highlight_start_at: '2026-05-10T00:00:00Z', highlight_end_at: '2026-05-01T00:00:00Z',
    });
    expect(err?.fields).toHaveProperty('highlight_end_at');
  });
});

describe('validateDocumentUpdate', () => {
  it('allows a partial update', () => {
    const out = validateDocumentUpdate({ title_en: 'New title' });
    expect(out.title_en).toBe('New title');
  });

  it('still rejects unknown fields', () => {
    expect(() => validateDocumentUpdate({ slug: 'hand-set' })).toThrow(ValidationError);
  });
});

describe('validateReplaceFile', () => {
  it('requires file_asset_id', () => {
    expect(() => validateReplaceFile({})).toThrow(ValidationError);
  });
  it('accepts a valid file_asset_id', () => {
    expect(validateReplaceFile({ file_asset_id: ASSET }).file_asset_id).toBe(ASSET);
  });
});
