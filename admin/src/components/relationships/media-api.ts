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
export function useMediaList(opts: { search?: string; enabled?: boolean } = {}) {
  const { search, enabled = true } = opts;
  return useQuery({
    queryKey: ['media', 'picker', { search: search ?? '' }],
    // The list endpoint filters `archived`; search matches filename/title server-side.
    queryFn: () =>
      getList<MediaItem>(ADMIN_MEDIA, {
        page_size: 40,
        archived: false,
        ...(search ? { search } : {}),
      }),
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
