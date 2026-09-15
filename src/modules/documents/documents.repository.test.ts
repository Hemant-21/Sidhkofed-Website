/**
 * Unit tests — document repository `buildWhere` (TASK 17: filtering, date filtering, public
 * visibility predicate, id-or-slug resolution). Pure and DB-free.
 */
import { describe, it, expect } from 'vitest';
import { buildWhere } from './documents.repository';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('buildWhere — public predicate', () => {
  it('applies the full shared public visibility predicate (incl. scheduled-publishing gate)', () => {
    const where = buildWhere({}, { public: true });
    // The shared predicate is composed as an AND element so it never collides with search.
    const predicate = (where.AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
    expect(predicate.publicVisibility).toBe(true);
    expect(predicate.isPublic).toBe(true);
    expect(predicate.archivedAt).toBeNull();
    // publish_start_at due (null OR <= now)
    expect(JSON.stringify(predicate.OR)).toContain('publishStartAt');
  });

  it('does not apply the public predicate for admin queries', () => {
    const where = buildWhere({ publicationState: 'draft' }, { public: false });
    expect(where.publicationState).toBe('draft');
    expect(where.isPublic).toBeUndefined();
  });
});

describe('buildWhere — filters', () => {
  it('resolves a document type by UUID vs slug', () => {
    expect(buildWhere({ documentType: UUID }, {}).documentType).toEqual({ id: UUID });
    expect(buildWhere({ documentType: 'report' }, {}).documentType).toEqual({ slug: 'report' });
  });

  it('resolves a financial year by UUID vs label', () => {
    expect(buildWhere({ financialYear: UUID }, {}).financialYear).toEqual({ id: UUID });
    expect(buildWhere({ financialYear: '2025-2026' }, {}).financialYear).toEqual({ label: '2025-2026' });
  });

  it('filters commodities via the junction', () => {
    expect(buildWhere({ commodity: 'lac' }, {}).commodities).toEqual({ some: { commodity: { slug: 'lac' } } });
  });

  it('resolves the legacy Knowledge Centre flag via the document type parent, not the deprecated column', () => {
    const where = buildWhere({ knowledgeCentre: true }, {});
    expect(where.showInKnowledgeCentre).toBeUndefined();
    expect((where.documentType as Record<string, unknown>).knowledgeCategoryId).toEqual({ not: null });
  });

  it('document_section=publications/notifications resolve via the document type parent', () => {
    const pub = buildWhere({ documentSection: 'publications' }, {});
    expect((pub.documentType as Record<string, unknown>).knowledgeCategoryId).toEqual({ not: null });
    const notif = buildWhere({ documentSection: 'notifications' }, {});
    expect((notif.documentType as Record<string, unknown>).communicationTypeId).toEqual({ not: null });
  });

  it('combines document type + category + section as AND, never broadening the result', () => {
    const where = buildWhere({ documentType: 'report', knowledgeCategory: 'research-and-reports', documentSection: 'publications' }, {});
    const documentTypeWhere = where.documentType as Record<string, unknown>;
    expect(documentTypeWhere.slug).toBe('report');
    expect(documentTypeWhere.knowledgeCategory).toEqual({ slug: 'research-and-reports' });
    // documentSection is redundant with an explicit knowledgeCategory filter and must not overwrite it.
    expect(documentTypeWhere.knowledgeCategoryId).toBeUndefined();
  });

  it('filters by communication type', () => {
    expect(buildWhere({ communicationType: 'notice' }, {}).documentType).toEqual({ communicationType: { slug: 'notice' } });
  });

  it('builds a publication_date range from year', () => {
    const where = buildWhere({ year: 2026 }, {});
    const range = where.publicationDate as { gte: Date; lte: Date };
    expect(range.gte.getUTCFullYear()).toBe(2026);
    expect(range.lte.getUTCFullYear()).toBe(2026);
  });

  it('builds a publication_date range from date_from/date_to', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-06-30T00:00:00Z');
    const where = buildWhere({ dateFrom: from, dateTo: to }, {});
    expect(where.publicationDate).toEqual({ gte: from, lte: to });
  });

  it('adds a bilingual keyword OR search', () => {
    const where = buildWhere({ search: 'annual' }, {});
    expect(JSON.stringify(where.AND)).toContain('titleEn');
    expect(JSON.stringify(where.AND)).toContain('descriptionHi');
  });
});
