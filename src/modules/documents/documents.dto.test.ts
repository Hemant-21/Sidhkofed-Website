/**
 * Unit tests — document DTO admin/public visibility contract.
 *
 * Admin detail includes internal-only fields (created_by, updated_by).
 * Public detail must NOT include them.
 * DB-free.
 */
import { describe, it, expect } from 'vitest';
import { toDocumentDetailDto, toPublicDocumentDetailDto } from './documents.dto';
import type { DocumentRow } from './documents.repository';

const TYPE = '11111111-1111-4111-8111-111111111111';
const ASSET = '22222222-2222-4222-8222-222222222222';

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
    ...over,
  } as DocumentRow;
}

describe('toPublicDocumentDetailDto — internal fields are excluded', () => {
  it('does not include admin-only keys in the public DTO', () => {
    const dto = toPublicDocumentDetailDto(makeRow());
    expect(dto).not.toHaveProperty('created_by');
    expect(dto).not.toHaveProperty('updated_by');
    expect(dto).not.toHaveProperty('publish_start_at');
  });

  it('does not leak the internal author id in the serialised public response', () => {
    const json = JSON.stringify(toPublicDocumentDetailDto(makeRow()));
    expect(json).not.toContain('u1');
  });
});

describe('toDocumentDetailDto — admin fields are present', () => {
  it('includes created_by/updated_by in the admin DTO', () => {
    const dto = toDocumentDetailDto(makeRow());
    expect(dto).toHaveProperty('created_by', 'u1');
    expect(dto).toHaveProperty('updated_by', 'u1');
  });

  it('includes the commodities and districts arrays for both admin and public DTOs', () => {
    const admin = toDocumentDetailDto(makeRow());
    const pub = toPublicDocumentDetailDto(makeRow());
    expect(admin.commodities).toEqual([]);
    expect(admin.districts).toEqual([]);
    expect(pub.commodities).toEqual([]);
    expect(pub.districts).toEqual([]);
  });
});
