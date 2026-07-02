/** Unit tests — event repository `buildWhere` (filtering, date range, public predicate). DB-free. */
import { describe, it, expect } from 'vitest';
import { buildWhere } from './events.repository';

const UUID = '22222222-2222-4222-8222-222222222222';

describe('events buildWhere', () => {
  it('applies the shared public predicate as an AND element', () => {
    const where = buildWhere({}, { public: true });
    const predicate = (where.AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
    expect(predicate.publicVisibility).toBe(true);
    expect(predicate.archivedAt).toBeNull();
  });

  it('uses publication_state only for admin queries', () => {
    expect(buildWhere({ publicationState: 'draft' }, { public: false }).publicationState).toBe('draft');
    expect(buildWhere({ publicationState: 'draft' }, { public: true }).publicationState).toBeUndefined();
  });

  it('resolves id-or-slug for masters and relations', () => {
    expect(buildWhere({ eventType: UUID }, {}).eventType).toEqual({ id: UUID });
    expect(buildWhere({ eventType: 'training' }, {}).eventType).toEqual({ slug: 'training' });
    expect(buildWhere({ commodity: 'lac' }, {}).commodities).toEqual({ some: { commodity: { slug: 'lac' } } });
    expect(buildWhere({ programme: UUID }, {}).programmes).toEqual({ some: { programmeScheme: { id: UUID } } });
    expect(buildWhere({ institution: 'jslps' }, {}).institutions).toEqual({ some: { institution: { slug: 'jslps' } } });
  });

  it('filters event_status and homepage flag', () => {
    expect(buildWhere({ eventStatus: 'completed' }, {}).eventStatus).toBe('completed');
    expect(buildWhere({ showOnHomepage: true }, {}).showOnHomepage).toBe(true);
  });

  it('builds a start_date range from year', () => {
    const where = buildWhere({ year: 2026 }, {});
    const range = where.startDate as { gte: Date; lte: Date };
    expect(range.gte.getUTCFullYear()).toBe(2026);
    expect(range.lte.getUTCFullYear()).toBe(2026);
  });

  it('adds a keyword search OR as an AND element (never colliding with the public OR)', () => {
    const where = buildWhere({ search: 'lac' }, { public: true });
    expect(Array.isArray(where.AND)).toBe(true);
    expect((where.AND as unknown[]).length).toBe(2); // public predicate + search
  });
});
