/**
 * Unit tests — document service business rules (TASKS 11/12/15/16/18):
 * file-asset linkability, media-usage registration, Knowledge-Centre rule, publish-requires-file,
 * file replacement re-points usage + audits, and public-cache invalidation on writes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DocumentRow } from './documents.repository';

const { repo, media, usage, audit, cache } = vi.hoisted(() => ({
  repo: {
    slugExists: vi.fn(), create: vi.fn(), findById: vi.fn(), findBySlug: vi.fn(), update: vi.fn(),
    list: vi.fn(), transaction: vi.fn(), setCommodities: vi.fn(), setDistricts: vi.fn(), setTags: vi.fn(),
    validateReferences: vi.fn(),
  },
  media: { getById: vi.fn() },
  usage: { registerUsage: vi.fn(), removeUsage: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
  cache: { getJson: vi.fn(), setJson: vi.fn(), del: vi.fn(), delByPrefix: vi.fn() },
}));

vi.mock('./documents.repository', () => ({ documentRepository: repo }));
vi.mock('@/modules/media/media.service', () => ({ mediaService: media }));
vi.mock('@/modules/media/media-usage.service', () => ({ mediaUsageService: usage }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));

import { documentService } from './documents.service';
import { ValidationError, NotFoundError, ConflictError } from '@/shared/errors';

const CTX = { userId: 'u1' };
const ASSET = '22222222-2222-4222-8222-222222222222';
const TYPE = '11111111-1111-4111-8111-111111111111';

function makeDoc(over: Partial<DocumentRow> = {}): DocumentRow {
  const now = new Date();
  return {
    id: 'd1', titleEn: 'Doc', titleHi: null, descriptionEn: null, descriptionHi: null,
    documentTypeId: TYPE, fileAssetId: ASSET, publicationDate: null, language: 'en', isPublic: true,
    showInKnowledgeCentre: false, knowledgeCategoryId: null, financialYearId: null, slug: 'doc',
    publicationState: 'draft', publicVisibility: true, publishStartAt: null, publishedAt: null,
    archivedAt: null, highlightType: null, highlightStartAt: null, highlightEndAt: null,
    displayOrder: null, showOnHomepage: false, createdById: 'u1', updatedById: 'u1',
    createdAt: now, updatedAt: now,
    documentType: { id: TYPE, slug: 'report', nameEn: 'Report', nameHi: null } as never,
    fileAsset: { id: ASSET, url: '/file', fileName: 'a.pdf', mimeType: 'application/pdf', fileSizeBytes: BigInt(10), title: null } as never,
    knowledgeCategory: null, financialYear: null, commodities: [], districts: [], tags: [],
    ...over,
  } as DocumentRow;
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.slugExists.mockResolvedValue(false);
  repo.validateReferences.mockResolvedValue({});
  repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
  media.getById.mockResolvedValue({ archived_at: null, mime_type: 'application/pdf' });
  cache.getJson.mockResolvedValue(null);
});

describe('documentService.create', () => {
  it('registers the file-asset usage, audits, and invalidates cache', async () => {
    const created = makeDoc();
    repo.create.mockResolvedValue(created);
    repo.findById.mockResolvedValue(created);

    await documentService.create({ title_en: 'Doc', document_type_id: TYPE, file_asset_id: ASSET }, CTX);

    expect(usage.registerUsage).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: ASSET, entityType: 'document', field: 'file_asset_id' }),
      {},
    );
    expect(audit.create).toHaveBeenCalledWith(expect.anything(), 'document', 'd1', expect.anything());
    expect(cache.delByPrefix).toHaveBeenCalled();
  });

  it('rejects linking an archived file asset', async () => {
    media.getById.mockResolvedValue({ archived_at: new Date().toISOString(), mime_type: 'application/pdf' });
    await expect(
      documentService.create({ title_en: 'Doc', document_type_id: TYPE, file_asset_id: ASSET }, CTX),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects linking an image asset (must be a document file)', async () => {
    media.getById.mockResolvedValue({ archived_at: null, mime_type: 'image/png' });
    await expect(
      documentService.create({ title_en: 'Doc', document_type_id: TYPE, file_asset_id: ASSET }, CTX),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a missing file asset (broken media reference)', async () => {
    media.getById.mockRejectedValue(new NotFoundError('Media asset not found.'));
    await expect(
      documentService.create({ title_en: 'Doc', document_type_id: TYPE, file_asset_id: ASSET }, CTX),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects inactive master references', async () => {
    repo.validateReferences.mockResolvedValue({ document_type_id: ['Document type is inactive.'] });
    await expect(
      documentService.create({ title_en: 'Doc', document_type_id: TYPE, file_asset_id: ASSET }, CTX),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('enforces the Knowledge-Centre category rule', async () => {
    await expect(
      documentService.create(
        { title_en: 'Doc', document_type_id: TYPE, file_asset_id: ASSET, show_in_knowledge_centre: true },
        CTX,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('documentService.lifecycle', () => {
  it('publishes a draft with a valid file and audits PUBLISH', async () => {
    repo.findById.mockResolvedValue(makeDoc());
    repo.update.mockResolvedValue(makeDoc({ publicationState: 'published', publishedAt: new Date() }));
    await documentService.lifecycle('d1', 'publish', CTX);
    expect(audit.log).toHaveBeenCalledWith('PUBLISH', expect.anything(), expect.objectContaining({ module: 'document' }));
    expect(cache.delByPrefix).toHaveBeenCalled();
  });

  it('refuses to publish when the file asset is archived', async () => {
    repo.findById.mockResolvedValue(makeDoc());
    media.getById.mockResolvedValue({ archived_at: new Date().toISOString(), mime_type: 'application/pdf' });
    await expect(documentService.lifecycle('d1', 'publish', CTX)).rejects.toBeInstanceOf(ValidationError);
  });

  it('archives and restores', async () => {
    repo.findById.mockResolvedValue(makeDoc({ publicationState: 'published', publishedAt: new Date() }));
    repo.update.mockResolvedValue(makeDoc({ publicationState: 'archived', archivedAt: new Date() }));
    await documentService.lifecycle('d1', 'archive', CTX);
    expect(audit.log).toHaveBeenCalledWith('ARCHIVE', expect.anything(), expect.anything());
  });
});

describe('documentService.replaceFile', () => {
  it('re-points media usage to the new asset and audits MEDIA_REPLACE', async () => {
    const NEW = '44444444-4444-4444-8444-444444444444';
    repo.findById.mockResolvedValue(makeDoc());
    repo.update.mockResolvedValue(makeDoc({ fileAssetId: NEW }));
    await documentService.replaceFile('d1', NEW, CTX);
    expect(usage.removeUsage).toHaveBeenCalledWith(expect.objectContaining({ mediaId: ASSET, field: 'file_asset_id' }), {});
    expect(usage.registerUsage).toHaveBeenCalledWith(expect.objectContaining({ mediaId: NEW, field: 'file_asset_id' }), {});
    expect(audit.log).toHaveBeenCalledWith('MEDIA_REPLACE', expect.anything(), expect.objectContaining({ module: 'document' }));
  });

  it('rejects replacing a file with the same asset', async () => {
    repo.findById.mockResolvedValue(makeDoc());
    await expect(documentService.replaceFile('d1', ASSET, CTX)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('documentService.publicDetailBySlug', () => {
  it('returns from cache when warm', async () => {
    cache.getJson.mockResolvedValue({ id: 'd1', slug: 'doc' });
    const dto = await documentService.publicDetailBySlug('doc');
    expect(dto).toEqual({ id: 'd1', slug: 'doc' });
    expect(repo.findBySlug).not.toHaveBeenCalled();
  });

  it('404s when the slug is not a public document', async () => {
    cache.getJson.mockResolvedValue(null);
    repo.findBySlug.mockResolvedValue(null);
    await expect(documentService.publicDetailBySlug('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
