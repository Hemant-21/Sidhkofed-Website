/** Unit tests — toolkit buildWhere + validators. DB-free. */
import { describe, it, expect } from 'vitest';
import { buildWhere } from './toolkits.repository';
import { validateToolkitCreate, validateToolkitUpdate } from './toolkits.validators';
import { ValidationError } from '@/shared/errors';

const UUID = '44444444-4444-4444-8444-444444444444';

describe('toolkits buildWhere', () => {
  it('applies the public predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
    expect(predicate.publicVisibility).toBe(true);
    expect(predicate.archivedAt).toBeNull();
  });

  it('uses publication_state only for admin queries', () => {
    expect(buildWhere({ publicationState: 'draft' }, { public: false }).publicationState).toBe('draft');
    expect(buildWhere({ publicationState: 'draft' }, { public: true }).publicationState).toBeUndefined();
  });

  it('filters commodity and programme by id-or-slug', () => {
    expect(buildWhere({ commodity: 'lac' }, {}).commodity).toEqual({ slug: 'lac' });
    expect(buildWhere({ commodity: UUID }, {}).commodity).toEqual({ id: UUID });
    expect(buildWhere({ programme: 'mfp-2026' }, {}).programmeScheme).toEqual({ slug: 'mfp-2026' });
    expect(buildWhere({ programme: UUID }, {}).programmeScheme).toEqual({ id: UUID });
  });

  it('adds a keyword search OR as an AND element (never colliding with the public OR)', () => {
    const where = buildWhere({ search: 'kit' }, { public: true });
    expect(Array.isArray(where.AND)).toBe(true);
    expect((where.AND as unknown[]).length).toBe(2); // public predicate + search
  });
});

describe('validateToolkitCreate', () => {
  it('accepts a minimal toolkit', () => {
    expect(validateToolkitCreate({ title_en: 'Lac Cultivation Kit' }).title_en).toBe('Lac Cultivation Kit');
  });

  it('accepts programme/commodity/cover references', () => {
    const out = validateToolkitCreate({ title_en: 'Kit', programme_scheme_id: UUID, commodity_id: UUID });
    expect(out.programme_scheme_id).toBe(UUID);
  });

  it('rejects an inverted highlight window', () => {
    expect(() =>
      validateToolkitCreate({
        title_en: 'Kit',
        highlight_type: 'new',
        highlight_start_at: '2026-07-10T00:00:00Z',
        highlight_end_at: '2026-07-01T00:00:00Z',
      }),
    ).toThrow(ValidationError);
  });

  it('rejects a non-uuid commodity reference', () => {
    expect(() => validateToolkitCreate({ title_en: 'Kit', commodity_id: 'lac' })).toThrow(ValidationError);
  });

  it('rejects unknown keys and server-managed fields', () => {
    expect(() => validateToolkitCreate({ title_en: 'Kit', foo: 1 })).toThrow(ValidationError);
    expect(() => validateToolkitCreate({ title_en: 'Kit', publication_state: 'published' })).toThrow(ValidationError);
    expect(() => validateToolkitCreate({ title_en: 'Kit', slug: 'kit' })).toThrow(ValidationError);
  });

  it('allows a partial update', () => {
    expect(validateToolkitUpdate({ summary_en: 'updated' }).summary_en).toBe('updated');
  });
});
