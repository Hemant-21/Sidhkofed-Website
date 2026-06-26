/**
 * Media Library types — a faithful mirror of the backend Media DTO (media.dto.ts) and the
 * usages/bulk-upload shapes (media.service.ts). The frontend consumes these contracts exactly;
 * it never exposes `storage_key` (API spec §7). `snake_case` matches the API transport.
 */

/** Media asset (media.dto.ts → MediaDto). */
export interface MediaAsset {
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

/** A reference to where an asset is used (media.service.ts → usages()). */
export interface MediaUsage {
  entity_type: string;
  entity_id: string;
  field: string;
  created_at: string;
}

/** Result of POST /admin/media/bulk-upload (media.service.ts → BulkUploadResult). */
export interface MediaBulkUploadResult {
  accepted: MediaAsset[];
  rejected: Array<{ file_name: string; error: string }>;
}

/** Result of POST /admin/media/{id}/replace-file (media.service.ts → replaceFile()). */
export interface MediaReplaceResult {
  old: MediaAsset;
  new: MediaAsset;
}

/** Editable descriptive metadata (media.validators.ts → mediaMetaSchema). */
export interface MediaMetaInput {
  title?: string;
  alt_text?: string;
  caption?: string;
}

/** True when the asset can be previewed inline as an image. */
export function isImage(asset: Pick<MediaAsset, 'mime_type'>): boolean {
  return asset.mime_type.startsWith('image/');
}
