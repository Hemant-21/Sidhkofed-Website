/**
 * Document service (TASK 18) — all business logic for the reusable document repository /
 * Knowledge Centre. No HTTP, no Prisma here (the repository owns Prisma; controllers own HTTP).
 *
 * Owns: CRUD + lifecycle (publish/unpublish/archive/restore), stable slug generation,
 * master-activation validation, file-asset linkability (reuses the Media service — never
 * duplicates upload logic), media-usage tracking (so a linked file cannot be hard-deleted),
 * the Knowledge-Centre category rule, version/replace-file handling, audit logging, and
 * Redis cache invalidation of public reads.
 *
 * Cross-module dependencies go through SERVICES only (mediaService / mediaUsageService /
 * auditService) — never another module's repository (dependency-graph cross-module rule).
 */
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { mediaService } from '@/modules/media/media.service';
import { mediaUsageService } from '@/modules/media/media-usage.service';
import { MEDIA_TYPE_REGISTRY } from '@/modules/media/media.validation';
import { documentRepository, type DocumentRow } from './documents.repository';
import {
  toDocumentDetailDto,
  toDocumentSummaryDto,
  toPublicDocumentDetailDto,
  toPublicDocumentSummaryDto,
  type DocumentDetailDto,
  type PublicDocumentDetailDto,
} from './documents.dto';
import { DOCUMENT_ENTITY, type DocumentFilters, type DocumentOrderingField } from './documents.types';
import type { DocumentCreateInput, DocumentUpdateInput } from './documents.validators';

const FILE_FIELD = 'file_asset_id';
const PUBLIC_CACHE_PREFIX = 'documents:public';

function loaded(row: DocumentRow | null): DocumentRow {
  if (!row) throw new NotFoundError('Document not found.');
  return row;
}

/** Drop the whole public document cache family after any write (fail-open). */
async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}

/**
 * Validate that a media asset is linkable as a document file (TASK 15 "broken media references",
 * TASK 6 allowed types). The bytes were already validated against size/MIME/extension at upload
 * time by the Media module — here we only assert the asset exists, is not archived, and is a
 * document-like (non-image) asset. Returns the asset's mime for auditing.
 */
async function assertLinkableDocumentAsset(mediaId: string): Promise<string> {
  let media: Awaited<ReturnType<typeof mediaService.getById>>;
  try {
    media = await mediaService.getById(mediaId);
  } catch {
    throw new ValidationError({ [FILE_FIELD]: ['Media asset not found.'] });
  }
  if (media.archived_at) {
    throw new ValidationError({ [FILE_FIELD]: ['Cannot link an archived media asset.'] });
  }
  const def = MEDIA_TYPE_REGISTRY[media.mime_type];
  if (!def || def.category === 'image') {
    throw new ValidationError({ [FILE_FIELD]: ['File must be a document (PDF, DOC/DOCX, XLS/XLSX, or ZIP), not an image.'] });
  }
  return media.mime_type;
}

/** Reject references to missing/inactive masters (delegated to the repo's active check). */
async function assertReferencesValid(refs: Parameters<typeof documentRepository.validateReferences>[0]): Promise<void> {
  const errors = await documentRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

/** Knowledge-Centre tag requires a category (API spec §6). Checked against the MERGED state. */
function assertKnowledgeCentreRule(showInKc: boolean, knowledgeCategoryId: string | null): void {
  if (showInKc && !knowledgeCategoryId) {
    throw new ValidationError({ knowledge_category_id: ['A knowledge category is required when show_in_knowledge_centre is true.'] });
  }
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: DocumentCreateInput, ctx: AuditContext): Promise<DocumentDetailDto> {
  const userId = requireUser(ctx);

  // Business rules: file must exist + be document-like; masters active; KC rule.
  const mimeType = await assertLinkableDocumentAsset(input.file_asset_id);
  await assertReferencesValid({
    documentTypeId: input.document_type_id,
    knowledgeCategoryId: input.knowledge_category_id ?? null,
    financialYearId: input.financial_year_id ?? null,
    commodityIds: input.commodity_ids,
    districtIds: input.district_ids,
    tagIds: input.tag_ids,
  });
  assertKnowledgeCentreRule(input.show_in_knowledge_centre ?? false, input.knowledge_category_id ?? null);

  const slug = await uniqueSlug(input.title_en, documentRepository.slugExists);

  const document = await documentRepository.transaction(async (tx) => {
    const created = await documentRepository.create(
      {
        titleEn: input.title_en,
        titleHi: input.title_hi ?? null,
        descriptionEn: input.description_en ?? null,
        descriptionHi: input.description_hi ?? null,
        documentTypeId: input.document_type_id,
        fileAssetId: input.file_asset_id,
        publicationDate: input.publication_date ?? null,
        language: input.language ?? 'en',
        isPublic: input.is_public ?? true,
        showInKnowledgeCentre: input.show_in_knowledge_centre ?? false,
        knowledgeCategoryId: input.knowledge_category_id ?? null,
        financialYearId: input.financial_year_id ?? null,
        slug,
        publicVisibility: input.public_visibility ?? true,
        publishStartAt: input.publish_start_at ?? null,
        highlightType: input.highlight_type ?? null,
        highlightStartAt: input.highlight_start_at ?? null,
        highlightEndAt: input.highlight_end_at ?? null,
        displayOrder: input.display_order ?? null,
        showOnHomepage: input.show_on_homepage ?? false,
        createdById: userId,
        updatedById: userId,
      },
      tx,
    );
    if (input.commodity_ids?.length) await documentRepository.setCommodities(created.id, input.commodity_ids, tx);
    if (input.district_ids?.length) await documentRepository.setDistricts(created.id, input.district_ids, tx);
    if (input.tag_ids?.length) await documentRepository.setTags(created.id, input.tag_ids, tx);
    // Register the file-asset usage so the asset cannot be hard-deleted while linked (TASK 16).
    await mediaUsageService.registerUsage(
      { mediaId: input.file_asset_id, entityType: DOCUMENT_ENTITY, entityId: created.id, field: FILE_FIELD },
      tx,
    );
    return created;
  });

  await auditService.create(ctx, DOCUMENT_ENTITY, document.id, {
    title_en: document.titleEn,
    slug: document.slug,
    file_asset_id: input.file_asset_id,
    mime_type: mimeType,
  });
  await invalidatePublicCache();
  // Reload with all relations for the detail response.
  return toDocumentDetailDto(loaded(await documentRepository.findById(document.id)));
}

// ── Update (PATCH — partial; never transitions publication state) ──────────────
export async function update(id: string, input: DocumentUpdateInput, ctx: AuditContext): Promise<DocumentDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await documentRepository.findById(id));

  const fileChanging = input.file_asset_id !== undefined && input.file_asset_id !== existing.fileAssetId;
  if (fileChanging && input.file_asset_id) await assertLinkableDocumentAsset(input.file_asset_id);

  // Validate only the references actually being changed.
  await assertReferencesValid({
    documentTypeId: input.document_type_id,
    knowledgeCategoryId: input.knowledge_category_id ?? undefined,
    financialYearId: input.financial_year_id ?? undefined,
    commodityIds: input.commodity_ids,
    districtIds: input.district_ids,
    tagIds: input.tag_ids,
  });

  // Knowledge-Centre rule against the merged state.
  const mergedShowKc = input.show_in_knowledge_centre ?? existing.showInKnowledgeCentre;
  const mergedCategory =
    input.knowledge_category_id !== undefined ? input.knowledge_category_id : existing.knowledgeCategoryId;
  assertKnowledgeCentreRule(mergedShowKc, mergedCategory);

  const updated = await documentRepository.transaction(async (tx) => {
    const row = await documentRepository.update(
      id,
      {
        titleEn: input.title_en,
        titleHi: input.title_hi,
        descriptionEn: input.description_en,
        descriptionHi: input.description_hi,
        documentTypeId: input.document_type_id,
        fileAssetId: input.file_asset_id,
        publicationDate: input.publication_date,
        language: input.language,
        isPublic: input.is_public,
        showInKnowledgeCentre: input.show_in_knowledge_centre,
        knowledgeCategoryId: input.knowledge_category_id,
        financialYearId: input.financial_year_id,
        publicVisibility: input.public_visibility,
        publishStartAt: input.publish_start_at,
        highlightType: input.highlight_type,
        highlightStartAt: input.highlight_start_at,
        highlightEndAt: input.highlight_end_at,
        displayOrder: input.display_order,
        showOnHomepage: input.show_on_homepage,
        updatedById: userId,
      },
      tx,
    );
    if (input.commodity_ids !== undefined) await documentRepository.setCommodities(id, input.commodity_ids, tx);
    if (input.district_ids !== undefined) await documentRepository.setDistricts(id, input.district_ids, tx);
    if (input.tag_ids !== undefined) await documentRepository.setTags(id, input.tag_ids, tx);
    // Re-point file-asset usage when the file changes (atomic with the row update).
    if (fileChanging) {
      await mediaUsageService.removeUsage(
        { mediaId: existing.fileAssetId, entityType: DOCUMENT_ENTITY, entityId: id, field: FILE_FIELD },
        tx,
      );
      if (input.file_asset_id) {
        await mediaUsageService.registerUsage(
          { mediaId: input.file_asset_id, entityType: DOCUMENT_ENTITY, entityId: id, field: FILE_FIELD },
          tx,
        );
      }
    }
    return row;
  });

  await auditService.update(ctx, DOCUMENT_ENTITY, id, undefined, { title_en: updated.titleEn });
  await invalidatePublicCache();
  return toDocumentDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<DocumentDetailDto> {
  return toDocumentDetailDto(loaded(await documentRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: DocumentFilters,
  ordering: { field: DocumentOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toDocumentSummaryDto>>> {
  const { rows, total } = await documentRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toDocumentSummaryDto), total };
}

// ── Lifecycle (publish / unpublish / archive / restore) ────────────────────────
export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<DocumentDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await documentRepository.findById(id));

  // Business rule (TASK 16): cannot publish without an uploaded, non-archived file.
  if (action === 'publish') {
    await assertLinkableDocumentAsset(existing.fileAssetId);
    // Knowledge-Centre integrity must hold at publish time too.
    assertKnowledgeCentreRule(existing.showInKnowledgeCentre, existing.knowledgeCategoryId);
  }

  const change = applyLifecycle(
    { publicationState: existing.publicationState, publishedAt: existing.publishedAt, archivedAt: existing.archivedAt },
    action,
  );
  const updated = await documentRepository.update(id, { ...change, updatedById: userId });

  await auditService.log(lifecycleEvent(action), ctx, {
    module: DOCUMENT_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toDocumentDetailDto(updated);
}

// ── Version management: replace the underlying file (TASK 8) ───────────────────
/**
 * POST /admin/documents/{id}/replace-file — swap `file_asset_id` to a NEW already-uploaded
 * asset while preserving the logical Document UUID/slug and history (API spec §6/§7.5). The
 * OLD asset is retained (media is never physically deleted); its usage link for this document
 * is moved to the new asset, and the replacement is audited as `media_replace` with the prior
 * asset id recorded for version history.
 */
export async function replaceFile(id: string, newFileAssetId: string, ctx: AuditContext): Promise<DocumentDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await documentRepository.findById(id));

  if (newFileAssetId === existing.fileAssetId) {
    throw new ConflictError('The new file is the same as the current file.');
  }
  const mimeType = await assertLinkableDocumentAsset(newFileAssetId);
  const previousAssetId = existing.fileAssetId;

  const updated = await documentRepository.transaction(async (tx) => {
    const row = await documentRepository.update(id, { fileAssetId: newFileAssetId, updatedById: userId }, tx);
    await mediaUsageService.removeUsage(
      { mediaId: previousAssetId, entityType: DOCUMENT_ENTITY, entityId: id, field: FILE_FIELD },
      tx,
    );
    await mediaUsageService.registerUsage(
      { mediaId: newFileAssetId, entityType: DOCUMENT_ENTITY, entityId: id, field: FILE_FIELD },
      tx,
    );
    return row;
  });

  await auditService.log('MEDIA_REPLACE', ctx, {
    module: DOCUMENT_ENTITY,
    recordId: id,
    summary: 'DOCUMENT_FILE_REPLACE',
    metadata: { previous_file_asset_id: previousAssetId, new_file_asset_id: newFileAssetId, mime_type: mimeType },
  });
  await invalidatePublicCache();
  return toDocumentDetailDto(updated);
}

// ── Public reads (visibility predicate + Redis cache) ──────────────────────────
export async function publicList(
  filters: DocumentFilters,
  ordering: { field: DocumentOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicDocumentSummaryDto>>> {
  const cached = await cacheService.getJson<ListResult<ReturnType<typeof toPublicDocumentSummaryDto>>>(cacheKey);
  if (cached) return cached;

  const { rows, total } = await documentRepository.list(filters, page.skip, page.take, { public: true, ordering });
  const result = { items: rows.map(toPublicDocumentSummaryDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export async function publicDetailBySlug(slug: string): Promise<PublicDocumentDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicDocumentDetailDto>(cacheKey);
  if (cached) return cached;

  const row = await documentRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('Document not found.');
  const dto = toPublicDocumentDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const documentService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  replaceFile,
  publicList,
  publicDetailBySlug,
};
