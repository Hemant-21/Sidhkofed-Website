/**
 * Media DTO + mapper. Exposes the API-spec media reference fields; NEVER the
 * `storage_key` (API spec §7). `file_size` is a Number (BigInt is not JSON-safe).
 */
import type { MediaAsset } from '@prisma/client';

export interface MediaDto {
  id: string;
  url: string;
  file_name: string;
  extension: string | null;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  checksum: string | null;
  archived_at: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

function extOf(name: string): string | null {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : null;
}

export function toMediaDto(m: MediaAsset): MediaDto {
  return {
    id: m.id,
    url: m.url,
    file_name: m.fileName,
    extension: extOf(m.fileName),
    mime_type: m.mimeType,
    file_size: Number(m.fileSizeBytes),
    width: m.width,
    height: m.height,
    title: m.title,
    alt_text: m.altText,
    caption: m.caption,
    checksum: m.checksum,
    archived_at: m.archivedAt ? m.archivedAt.toISOString() : null,
    uploaded_by: m.uploadedById,
    created_at: m.createdAt.toISOString(),
    updated_at: m.updatedAt.toISOString(),
  };
}
