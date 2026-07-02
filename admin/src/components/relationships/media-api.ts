'use client';

/**
 * Media data layer for the reusable picker (API spec §6/§7). Reads the existing media
 * library (`GET /admin/media`) and uploads through the existing multipart endpoint
 * (`POST /admin/media`) — NO duplicate upload pipeline. The full Media Library module is a
 * separate phase; this is only the link/select surface content modules share.
 */

import { useQuery } from '@tanstack/react-query';
import { getList, uploadFile } from '@/lib/api/http';

/** Compact media record (subset of the backend MediaDto we need to render/select). */
export interface MediaItem {
  id: string;
  url: string;
  file_name: string;
  mime_type: string;
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
}

const ADMIN_MEDIA = '/admin/media';

/** Recent, non-archived images for the picker grid. Server-side search by filename/title. */
/**
 * Keep only image assets (mime_type `image/*`). The backend `mime_type` filter is an EXACT match
 * (media.repository.ts), so it cannot express "any image" across jpeg/png/webp/…; per the Phase 15.7
 * remediation contract we apply the documented client-side fallback instead. This prevents PDFs/DOCs
 * and other non-image assets from appearing in image-selection dialogs (and broken thumbnails).
 */
export function keepImagesOnly(items: MediaItem[]): MediaItem[] {
  return items.filter((m) => typeof m.mime_type === 'string' && m.mime_type.startsWith('image/'));
}

/**
 * Recent, non-archived media for the picker grid. Server-side search by filename/title.
 * `imageOnly` (default false) restricts results to image assets — the shared image picker passes it
 * so cover/icon/thumbnail/gallery selections never surface non-image assets.
 */
export function useMediaList(opts: { search?: string; enabled?: boolean; imageOnly?: boolean } = {}) {
  const { search, enabled = true, imageOnly = false } = opts;
  return useQuery({
    queryKey: ['media', 'picker', { search: search ?? '', imageOnly }],
    // The list endpoint filters `archived`; search matches filename/title server-side. When
    // imageOnly, fetch a slightly larger page then keep only images so the grid stays well-filled.
    queryFn: async () => {
      const res = await getList<MediaItem>(ADMIN_MEDIA, {
        page_size: imageOnly ? 60 : 40,
        archived: false,
        ...(search ? { search } : {}),
      });
      return imageOnly ? { ...res, items: keepImagesOnly(res.items) } : res;
    },
    enabled,
    staleTime: 30_000,
  });
}

/** Upload one image and return the created media reference. Reuses the shared multipart helper. */
export function uploadMedia(
  file: File,
  fields?: { title?: string; alt_text?: string; caption?: string },
  onProgress?: (pct: number) => void,
): Promise<MediaItem> {
  const stringFields: Record<string, string> = {};
  if (fields?.title) stringFields.title = fields.title;
  if (fields?.alt_text) stringFields.alt_text = fields.alt_text;
  if (fields?.caption) stringFields.caption = fields.caption;
  return uploadFile<MediaItem>(ADMIN_MEDIA, file, stringFields, onProgress);
}
