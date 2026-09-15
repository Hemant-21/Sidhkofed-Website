import { describe, expect, it } from 'vitest';
import { referenceFilter } from './reference-filter';
import { buildWhere as events } from '@/modules/events/events.repository';
import { buildWhere as documents } from '@/modules/documents/documents.repository';
import { buildWhere as procurement } from '@/modules/procurement-updates/procurement-updates.repository';

describe('multi-value public reference filters', () => {
  it('keeps single values compatible and accepts mixed UUIDs and slugs', () => {
    const id = '22222222-2222-4222-8222-222222222222';
    expect(referenceFilter('training')).toEqual({ slug: 'training' });
    expect(referenceFilter(`training, ${id},training`)).toEqual({ OR: [{ slug: 'training' }, { id }] });
    expect(() => referenceFilter('training,,workshop')).toThrow();
    expect(() => referenceFilter(Array.from({ length: 101 }, (_, i) => `type-${i}`).join(','))).toThrow();
  });

  it('combines event alternatives with district, search and public visibility', () => {
    const where = events({ eventType: 'workshop,awareness-programme', district: 'ranchi,khunti', search: 'lac' }, { public: true });
    expect(where.eventType).toEqual({ OR: [{ slug: 'workshop' }, { slug: 'awareness-programme' }] });
    expect(where.district).toEqual({ OR: [{ slug: 'ranchi' }, { slug: 'khunti' }] });
    expect(where.AND).toEqual(expect.arrayContaining([expect.objectContaining({ publicationState: 'published', publicVisibility: true, archivedAt: null })]));
    expect(where.AND).toHaveLength(2);
  });

  it('preserves document access restrictions when multiple categories are chosen', () => {
    const where = documents({ knowledgeCategory: 'bye-laws,forms-and-formats', knowledgeCentre: true }, { public: true });
    const documentType = where.documentType as { knowledgeCategory?: unknown; knowledgeCategoryId?: unknown };
    expect(documentType.knowledgeCategory).toEqual({ OR: [{ slug: 'bye-laws' }, { slug: 'forms-and-formats' }] });
    // The explicit category filter already scopes to Publications; the legacy knowledgeCentre
    // flag must not additionally overwrite it with a redundant knowledgeCategoryId predicate.
    expect(documentType.knowledgeCategoryId).toBeUndefined();
    expect(where.AND).toEqual(expect.arrayContaining([expect.objectContaining({ isPublic: true, publicationState: 'published' })]));
  });

  it('combines procurement types, commodities and the upcoming date boundary', () => {
    const date = new Date('2026-09-10T00:00:00Z');
    const where = procurement({ procurementUpdateType: 'procurement-rate,procurement-schedule', commodity: 'lac,honey', dateFrom: date }, { public: true });
    expect(where.procurementUpdateType).toEqual({ OR: [{ slug: 'procurement-rate' }, { slug: 'procurement-schedule' }] });
    expect(where.commodity).toEqual({ OR: [{ slug: 'lac' }, { slug: 'honey' }] });
    expect(where.effectiveDate).toEqual({ gte: date });
    expect(where.AND).toEqual(expect.arrayContaining([expect.objectContaining({ publicationState: 'published' })]));
  });

  it('does not let a year selection override the upcoming date boundary', () => {
    const date = new Date('2026-09-10T00:00:00Z');
    for (const build of [events, documents, procurement]) {
      const where = build({ dateFrom: date, year: 2026 }, {});
      const range = 'startDate' in where ? where.startDate : 'publicationDate' in where ? where.publicationDate : 'effectiveDate' in where ? where.effectiveDate : undefined;
      expect(range).toEqual({ gte: date, lte: new Date('2026-12-31T23:59:59.999Z') });
    }
  });
});
