/**
 * Media DTO + mapper. Exposes the API-spec media reference fields; NEVER the
 * `storage_key` (API spec §7). `file_size` is a Number (BigInt is not JSON-safe).
 */
import type { MediaAsset } from '@prisma/client';

export type MediaVariantName = 'thumb' | 'card' | 'hero';

export interface MediaVariantDto {
  url: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
}

export type MediaVariantMap = Partial<Record<MediaVariantName, MediaVariantDto>>;

export interface MediaDto {
  id: string;
  url: string;
  variants: MediaVariantMap | null;
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

type StoredVariant = {
  key: string;
  url: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
};

function parseVariants(value: unknown): MediaVariantMap | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: MediaVariantMap = {};
  for (const name of ['thumb', 'card', 'hero'] as const) {
    const v = (value as Record<string, unknown>)[name] as Partial<StoredVariant> | undefined;
    if (
      v &&
      typeof v.url === 'string' &&
      typeof v.mime_type === 'string' &&
      typeof v.file_size === 'number' &&
      typeof v.width === 'number' &&
      typeof v.height === 'number'
    ) {
      out[name] = {
        url: v.url,
        mime_type: v.mime_type,
        file_size: v.file_size,
        width: v.width,
        height: v.height,
      };
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function extOf(name: string): string | null {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : null;
}

export function toMediaDto(m: MediaAsset): MediaDto {
  return {
    id: m.id,
    url: m.url,
    variants: parseVariants(m.variants),
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
