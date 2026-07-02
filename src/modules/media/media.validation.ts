/**
 * Media file validation (TASK 5) — pure, dependency-free so it is unit-testable.
 *
 * Validates size, MIME, and extension, and sniffs magic bytes to confirm the declared
 * type matches the actual content (API spec §7 "validate type/size by inspection").
 * Also computes the checksum and best-effort image dimensions, and exposes the
 * integration hook points (virus scan, image optimization, thumbnail).
 */
import { createHash } from 'node:crypto';
import { UnsupportedFileTypeError, ValidationError } from '@/shared/errors';

export type MediaCategory = 'image' | 'document' | 'archive';
type Family = 'jpeg' | 'png' | 'gif' | 'webp' | 'svg' | 'pdf' | 'zip' | 'ole' | 'unknown';

interface MediaTypeDef {
  family: Family;
  extensions: string[];
  category: MediaCategory;
}

/**
 * Supported upload types (Images, PDFs, Word, Excel, ZIP). Videos are metadata-only.
 *
 * SVG is intentionally ABSENT (pre-Phase-5 audit, Issue 3): `image/svg+xml` is an XML
 * document that can carry scripts/external references, so it is disabled entirely. XML/SVG
 * byte content is also rejected by `validateUpload` regardless of the declared type.
 */
export const MEDIA_TYPE_REGISTRY: Record<string, MediaTypeDef> = {
  'image/jpeg': { family: 'jpeg', extensions: ['jpg', 'jpeg'], category: 'image' },
  'image/png': { family: 'png', extensions: ['png'], category: 'image' },
  'image/webp': { family: 'webp', extensions: ['webp'], category: 'image' },
  'image/gif': { family: 'gif', extensions: ['gif'], category: 'image' },
  'application/pdf': { family: 'pdf', extensions: ['pdf'], category: 'document' },
  'application/msword': { family: 'ole', extensions: ['doc'], category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { family: 'zip', extensions: ['docx'], category: 'document' },
  'application/vnd.ms-excel': { family: 'ole', extensions: ['xls'], category: 'document' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { family: 'zip', extensions: ['xlsx'], category: 'document' },
  'application/zip': { family: 'zip', extensions: ['zip'], category: 'archive' },
  'application/x-zip-compressed': { family: 'zip', extensions: ['zip'], category: 'archive' },
};

/** Detect a coarse content family from magic bytes. */
export function detectFamily(buf: Buffer): Family {
  if (buf.length < 4) return 'unknown';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'pdf';
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) return 'zip';
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return 'ole';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  const head = buf.toString('utf8', 0, Math.min(buf.length, 256)).trimStart().toLowerCase();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) return 'svg';
  return 'unknown';
}

/** sha256 hex digest — integrity + dedupe. */
export function computeChecksum(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** Best-effort intrinsic dimensions for common raster images. Null when unknown. */
export function readImageDimensions(buf: Buffer, mime: string): { width: number | null; height: number | null } {
  try {
    if (mime === 'image/png' && buf.length >= 24) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (mime === 'image/gif' && buf.length >= 10) {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
    if (mime === 'image/jpeg') {
      let offset = 2;
      while (offset + 9 < buf.length) {
        if (buf[offset] !== 0xff) { offset += 1; continue; }
        const marker = buf[offset + 1] as number;
        // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 carry frame dimensions.
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
        }
        offset += 2 + buf.readUInt16BE(offset + 2);
      }
    }
  } catch {
    // fall through to null
  }
  return { width: null, height: null };
}

export interface ValidateUploadInput {
  buffer: Buffer;
  originalName: string;
  declaredMime: string;
  maxImageBytes: number;
  maxDocumentBytes: number;
  /**
   * Configured upload policy (Issue 4). When provided, the declared MIME must be on this
   * allow-list — sourced from Settings/env, never hardcoded. Omitted only by low-level unit
   * tests; the service always supplies it.
   */
  allowedMimeTypes?: string[];
}

export interface ValidatedFile {
  mimeType: string;
  extension: string;
  sizeBytes: number;
  category: MediaCategory;
  width: number | null;
  height: number | null;
}

/** Validate size, MIME, extension and content family. Throws typed errors on failure. */
export function validateUpload(input: ValidateUploadInput): ValidatedFile {
  const { buffer, originalName, declaredMime } = input;
  const size = buffer.byteLength;
  if (size === 0) throw new ValidationError({ file: ['File is empty.'] });

  // Configured policy gate (Issue 4): the declared type must be permitted by Settings/env.
  if (input.allowedMimeTypes && !input.allowedMimeTypes.includes(declaredMime)) {
    throw new UnsupportedFileTypeError(`Type "${declaredMime}" is not permitted by the upload policy.`);
  }

  const def = MEDIA_TYPE_REGISTRY[declaredMime];
  if (!def) throw new UnsupportedFileTypeError(`Unsupported MIME type "${declaredMime}".`);

  const ext = fileExtension(originalName);
  if (!def.extensions.includes(ext)) {
    throw new ValidationError({ file: [`Extension ".${ext}" does not match type ${declaredMime}.`] });
  }

  // Content inspection. SVG/XML byte content is rejected outright (Issue 3) — it is never a
  // permitted family, so any file whose bytes look like XML/SVG is blocked regardless of the
  // declared MIME. Other families must match their declared type.
  const family = detectFamily(buffer);
  if (family === 'svg') {
    throw new UnsupportedFileTypeError('SVG/XML uploads are not permitted.');
  }
  if (family !== def.family) {
    throw new UnsupportedFileTypeError('File content does not match its declared type.');
  }

  const limit = def.category === 'image' ? input.maxImageBytes : input.maxDocumentBytes;
  if (size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    throw new ValidationError({ file: [`File exceeds the ${mb} MB limit for ${def.category}s.`] });
  }

  const dims = def.category === 'image' ? readImageDimensions(buffer, declaredMime) : { width: null, height: null };
  return { mimeType: declaredMime, extension: ext, sizeBytes: size, category: def.category, ...dims };
}

// ── Integration hook points (TASK 5) ─────────────────────────────────────────
// NOTE: malware scanning moved to media.scanner.ts (Issue 3) — it now has an honest
// contract that can never return a false "clean" result.

/** Future image-optimization hook (no-op seam in Phase 3). */
export async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  // TODO(media): re-encode/strip metadata/resize variants when an optimizer is added.
  return buffer;
}

/** Future thumbnail-generation hook (no-op seam in Phase 3). Returns null = no thumbnail. */
export async function generateThumbnail(_buffer: Buffer, _mime: string): Promise<Buffer | null> {
  // TODO(media): generate a thumbnail variant and store it as a derived asset.
  return null;
}
