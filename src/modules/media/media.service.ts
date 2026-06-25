/**
 * Media service (TASK 5) — orchestrates validation → virus-scan → storage write →
 * metadata persistence → audit, with a Redis metadata cache (TASK 10). Depends only on
 * the storage *interface* (dependency inversion) — it never knows where bytes live.
 */
import { randomUUID } from 'node:crypto';
import type { MediaAsset } from '@prisma/client';
import { storage } from '@/services/storage';
import { redis } from '@/services/redis';
import { redisConfig, uploadConfig, appConfig } from '@/config';
import { logger } from '@/shared/logger';
import { NotFoundError, ProtectedRecordError, ValidationError, UnsupportedFileTypeError } from '@/shared/errors';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { settingsService } from '@/modules/settings/settings.service';
import { mediaRepository } from './media.repository';
import { mediaUsageService } from './media-usage.service';
import { validateUpload, computeChecksum } from './media.validation';
import { runMalwareScan, securityLog } from './media.scanner';
import { toMediaDto, type MediaDto } from './media.dto';

const mediaLog = logger.child({ component: 'media' });

export interface UploadFile {
  buffer: Buffer;
  originalName: string;
  declaredMime: string;
}
export interface UploadMeta {
  title?: string | null;
  altText?: string | null;
  caption?: string | null;
}

const metaCacheKey = (id: string): string => `media:meta:${id}`;

/** Stable public delivery endpoint for an asset (relative to the API origin). */
function deliveryEndpoint(id: string): string {
  return `${appConfig.apiBasePath}/public/media/${id}/file`;
}

async function cacheDto(dto: MediaDto): Promise<void> {
  try {
    await redis.set(metaCacheKey(dto.id), JSON.stringify(dto), 'EX', redisConfig.cacheTtlSeconds);
  } catch (err) {
    mediaLog.warn({ err, id: dto.id }, 'Media cache write failed');
  }
}
async function invalidateCache(id: string): Promise<void> {
  try {
    await redis.del(metaCacheKey(id));
  } catch (err) {
    mediaLog.warn({ err, id }, 'Media cache invalidation failed');
  }
}

interface PersistResult {
  asset: MediaAsset;
  scanStatus: string;
}

/** Validate, scan, store, and persist one file. */
async function persistUpload(file: UploadFile, meta: UploadMeta, ctx: AuditContext): Promise<PersistResult> {
  // Upload policy is sourced from Settings (runtime SoT) / env — never hardcoded (Issue 4).
  const [maxImageBytes, maxDocumentBytes, allowedImageTypes, allowedDocumentTypes] = await Promise.all([
    settingsService.getMaxImageBytes(),
    settingsService.getMaxDocumentBytes(),
    settingsService.getAllowedImageTypes(),
    settingsService.getAllowedDocumentTypes(),
  ]);
  const allowedMimeTypes = [...new Set([...allowedImageTypes, ...allowedDocumentTypes])];

  const validated = validateUpload({
    buffer: file.buffer,
    originalName: file.originalName,
    declaredMime: file.declaredMime,
    maxImageBytes,
    maxDocumentBytes,
    allowedMimeTypes,
  });

  // Honest malware scan (Issue 3): a false "clean" is impossible. Infected/unconfigured
  // uploads are rejected; "unscanned" (scanning disabled) is allowed but logged + audited.
  const scan = await runMalwareScan(file.buffer, { enabled: uploadConfig.malwareScanEnabled });
  if (scan.status === 'infected') {
    securityLog.warn({ file_name: file.originalName, scanner: scan.scanner }, 'Rejected infected upload');
    throw new UnsupportedFileTypeError('File failed malware scanning.');
  }
  if (scan.status === 'unconfigured' || scan.status === 'error') {
    securityLog.error(
      { file_name: file.originalName, scan_status: scan.status },
      'Malware scanning is enabled but no working scanner is configured — rejecting upload',
    );
    throw new UnsupportedFileTypeError('Upload rejected: malware scanning is unavailable.');
  }
  if (scan.status === 'unscanned') {
    securityLog.warn(
      { file_name: file.originalName, mime: validated.mimeType },
      'Accepting unscanned upload (MALWARE_SCAN_ENABLED=false)',
    );
  }

  const checksum = computeChecksum(file.buffer);
  const year = new Date().getFullYear();
  const id = randomUUID();
  const storageKey = `media/${year}/${id}.${validated.extension}`;

  await storage.put({ key: storageKey, body: file.buffer, contentType: validated.mimeType, checksum });

  // Store a STABLE, non-expiring delivery URL — the app's own media-file endpoint — never a
  // time-limited signed URL (Issue 2). Signed URLs are generated on demand at delivery time.
  const url = deliveryEndpoint(id);

  const asset = await mediaRepository.create({
    id,
    storageKey,
    url,
    fileName: file.originalName,
    mimeType: validated.mimeType,
    fileSizeBytes: validated.sizeBytes,
    width: validated.width,
    height: validated.height,
    title: meta.title ?? null,
    altText: meta.altText ?? null,
    caption: meta.caption ?? null,
    checksum,
    uploadedById: ctx.userId ?? null,
  });
  return { asset, scanStatus: scan.status };
}

/** POST /admin/media — single upload. */
export async function upload(file: UploadFile, meta: UploadMeta, ctx: AuditContext): Promise<MediaDto> {
  const { asset, scanStatus } = await persistUpload(file, meta, ctx);
  const dto = toMediaDto(asset);
  await cacheDto(dto);
  await auditService.log('MEDIA_UPLOAD', ctx, {
    module: 'media',
    recordId: asset.id,
    summary: 'MEDIA_UPLOAD',
    metadata: { file_name: asset.fileName, mime_type: asset.mimeType, size: Number(asset.fileSizeBytes), scan_status: scanStatus },
  });
  return dto;
}

export interface BulkUploadResult {
  accepted: MediaDto[];
  rejected: Array<{ file_name: string; error: string }>;
}

/** POST /admin/media/bulk-upload — best-effort per file. */
export async function bulkUpload(files: UploadFile[], ctx: AuditContext): Promise<BulkUploadResult> {
  if (files.length === 0) throw new ValidationError({ files: ['At least one file is required.'] });
  if (files.length > uploadConfig.bulkMaxFiles) {
    throw new ValidationError({ files: [`A maximum of ${uploadConfig.bulkMaxFiles} files may be uploaded at once.`] });
  }
  const result: BulkUploadResult = { accepted: [], rejected: [] };
  for (const file of files) {
    try {
      result.accepted.push(await upload(file, {}, ctx));
    } catch (err) {
      result.rejected.push({ file_name: file.originalName, error: err instanceof Error ? err.message : 'Upload failed.' });
    }
  }
  return result;
}

export interface MediaListQuery {
  mimeType?: string;
  archived?: boolean;
  search?: string;
  usedBy?: string;
}

export async function list(query: MediaListQuery, skip: number, take: number, direction: 'asc' | 'desc') {
  const { rows, total } = await mediaRepository.list(query, skip, take, direction);
  return { items: rows.map(toMediaDto), total };
}

/** GET /admin/media/:id — cache-first. */
export async function getById(id: string): Promise<MediaDto> {
  try {
    const cached = await redis.get(metaCacheKey(id));
    if (cached) return JSON.parse(cached) as MediaDto;
  } catch (err) {
    mediaLog.warn({ err, id }, 'Media cache read failed');
  }
  const asset = await mediaRepository.findById(id);
  if (!asset) throw new NotFoundError('Media asset not found.');
  const dto = toMediaDto(asset);
  await cacheDto(dto);
  return dto;
}

export async function updateMeta(id: string, meta: UploadMeta, ctx: AuditContext): Promise<MediaDto> {
  const existing = await mediaRepository.findById(id);
  if (!existing) throw new NotFoundError('Media asset not found.');
  const updated = await mediaRepository.updateMeta(id, {
    title: meta.title,
    altText: meta.altText,
    caption: meta.caption,
  });
  await invalidateCache(id);
  const dto = toMediaDto(updated);
  await auditService.update(ctx, 'media', id,
    { title: existing.title, alt_text: existing.altText, caption: existing.caption },
    { title: updated.title, alt_text: updated.altText, caption: updated.caption });
  await cacheDto(dto);
  return dto;
}

/** POST /admin/media/:id/archive — idempotent soft archive. */
export async function archive(id: string, ctx: AuditContext): Promise<MediaDto> {
  const existing = await mediaRepository.findById(id);
  if (!existing) throw new NotFoundError('Media asset not found.');
  const updated = existing.archivedAt ? existing : await mediaRepository.setArchived(id, new Date());
  await invalidateCache(id);
  const dto = toMediaDto(updated);
  await auditService.log('MEDIA_ARCHIVE', ctx, { module: 'media', recordId: id, summary: 'MEDIA_ARCHIVE' });
  await cacheDto(dto);
  return dto;
}

/** POST /admin/media/:id/restore — un-archive. */
export async function restore(id: string, ctx: AuditContext): Promise<MediaDto> {
  const existing = await mediaRepository.findById(id);
  if (!existing) throw new NotFoundError('Media asset not found.');
  const updated = existing.archivedAt ? await mediaRepository.setArchived(id, null) : existing;
  await invalidateCache(id);
  const dto = toMediaDto(updated);
  await auditService.restore(ctx, 'media', id);
  await cacheDto(dto);
  return dto;
}

/**
 * POST /admin/media/:id/replace-file — create a NEW asset and chain the old one
 * (`replaced_by_id`); the old asset is retained (API spec §7.5). Returns both refs.
 */
export async function replaceFile(id: string, file: UploadFile, ctx: AuditContext): Promise<{ old: MediaDto; new: MediaDto }> {
  const old = await mediaRepository.findById(id);
  if (!old) throw new NotFoundError('Media asset not found.');

  const { asset: created, scanStatus } = await persistUpload(
    file,
    { title: old.title, altText: old.altText, caption: old.caption },
    ctx,
  );
  const updatedOld = await mediaRepository.setReplacedBy(id, created.id);
  await invalidateCache(id);

  await auditService.log('MEDIA_REPLACE', ctx, {
    module: 'media',
    recordId: id,
    summary: 'MEDIA_REPLACE',
    metadata: { replaced_by_id: created.id, scan_status: scanStatus },
  });
  return { old: toMediaDto(updatedOld), new: toMediaDto(created) };
}

/**
 * GET /admin/media/:id/url — resolve a FRESH delivery URL on demand (Issue 2):
 *   - S3: a newly-signed, time-limited GET URL (never persisted).
 *   - local: the app's stable media-file endpoint.
 */
export async function getDeliveryUrl(id: string): Promise<{ url: string }> {
  const asset = await mediaRepository.findById(id);
  if (!asset || asset.archivedAt) throw new NotFoundError('Media asset not found.');
  if (storage.servesThroughApp) return { url: asset.url };
  return { url: await storage.getUrl(asset.storageKey) };
}

/** Result of opening a media file for delivery: either a redirect target or in-process bytes. */
export type MediaDelivery =
  | { kind: 'redirect'; url: string }
  | { kind: 'stream'; stream: NodeJS.ReadableStream; contentType: string; fileName: string }
  | { kind: 'buffer'; body: Buffer; contentType: string; fileName: string };

/**
 * GET /public/media/:id/file — serve the bytes of a non-archived asset (Issue 2):
 *   - S3: 302 redirect to a fresh signed URL (offloads bytes to object storage/CDN).
 *   - local: stream the file through the app (local files are not otherwise served).
 */
export async function openFile(id: string): Promise<MediaDelivery> {
  const asset = await mediaRepository.findById(id);
  if (!asset || asset.archivedAt) throw new NotFoundError('Media asset not found.');

  if (!storage.servesThroughApp) {
    return { kind: 'redirect', url: await storage.getUrl(asset.storageKey) };
  }
  if (storage.createReadStream) {
    return {
      kind: 'stream',
      stream: storage.createReadStream(asset.storageKey),
      contentType: asset.mimeType,
      fileName: asset.fileName,
    };
  }
  const body = await storage.get(asset.storageKey);
  return { kind: 'buffer', body, contentType: asset.mimeType, fileName: asset.fileName };
}

/** GET /admin/media/:id/usages — where the asset is referenced. */
export async function usages(id: string) {
  const asset = await mediaRepository.findById(id);
  if (!asset) throw new NotFoundError('Media asset not found.');
  const used = await mediaUsageService.whereUsed(id);
  return used.map((u) => ({
    entity_type: u.entityType,
    entity_id: u.entityId,
    field: u.field,
    created_at: u.createdAt.toISOString(),
  }));
}

/**
 * Hard delete — only permitted for an UNUSED, archived asset (build-context rule).
 * Not a routed endpoint; provided for completeness / future admin tooling.
 */
export async function hardDelete(id: string): Promise<void> {
  const asset = await mediaRepository.findById(id);
  if (!asset) throw new NotFoundError('Media asset not found.');
  if (await mediaUsageService.isUsed(id)) {
    throw new ProtectedRecordError('This media asset is in use and cannot be deleted.');
  }
  throw new ProtectedRecordError('Hard delete is disabled; archive media instead.');
}

export const mediaService = {
  upload,
  bulkUpload,
  list,
  getById,
  updateMeta,
  archive,
  restore,
  replaceFile,
  usages,
  getDeliveryUrl,
  openFile,
};
