/**
 * Unit tests — document DTO tag visibility contract.
 *
 * Admin detail includes tags (internal CMS classification).
 * Public detail must NOT include tags (isPublic: false in the masters registry).
 * DB-free.
 */
import { describe, it, expect } from 'vitest';
import { toDocumentDetailDto, toPublicDocumentDetailDto } from './documents.dto';
import type { DocumentRow } from './documents.repository';

const TYPE = '11111111-1111-4111-8111-111111111111';
const ASSET = '22222222-2222-4222-8222-222222222222';
const TAG_ID = '33333333-3333-4333-8333-333333333333';

function makeRow(over: Partial<DocumentRow> = {}): DocumentRow {
  const now = new Date();
  return {
    id: 'd1', titleEn: 'Doc', titleHi: null, descriptionEn: null, descriptionHi: null,
    documentTypeId: TYPE, fileAssetId: ASSET, publicationDate: null, language: 'en', isPublic: true,
    showInKnowledgeCentre: false, knowledgeCategoryId: null, financialYearId: null, slug: 'doc',
    publicationState: 'published', publicVisibility: true, publishStartAt: null, publishedAt: now,
    archivedAt: null, highlightType: null, highlightStartAt: null, highlightEndAt: null,
    displayOrder: null, showOnHomepage: false, createdById: 'u1', updatedById: 'u1',
    createdAt: now, updatedAt: now,
    documentType: { id: TYPE, slug: 'report', nameEn: 'Report', nameHi: null } as never,
    fileAsset: { id: ASSET, url: '/file', fileName: 'a.pdf', mimeType: 'application/pdf', fileSizeBytes: BigInt(10), title: null } as never,
    knowledgeCategory: null, financialYear: null, commodities: [], districts: [],
    tags: [{ tag: { id: TAG_ID, slug: 'internal', nameEn: 'Internal', nameHi: null } }] as never,
    ...over,
  } as DocumentRow;
}

describe('toPublicDocumentDetailDto — tags are excluded', () => {
  it('does not include a tags key in the public DTO', () => {
    const dto = toPublicDocumentDetailDto(makeRow());
    expect(dto).not.toHaveProperty('tags');
  });

  it('does not leak any tag slugs in the serialised public response', () => {
    const json = JSON.stringify(toPublicDocumentDetailDto(makeRow()));
    expect(json).not.toContain('internal');
    expect(json).not.toContain(TAG_ID);
  });
});

describe('toDocumentDetailDto — tags are present for admin', () => {
  it('includes the tags array in the admin DTO', () => {
    const dto = toDocumentDetailDto(makeRow());
    expect(dto).toHaveProperty('tags');
    expect(dto.tags).toHaveLength(1);
    expect(dto.tags[0]).toMatchObject({ slug: 'internal', name_en: 'Internal' });
  });

  it('returns an empty tags array when there are no tags', () => {
    const dto = toDocumentDetailDto(makeRow({ tags: [] as never }));
    expect(dto.tags).toEqual([]);
  });
});
