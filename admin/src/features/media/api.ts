'use client';

/**
 * Media Library data layer (API spec §6/§7). Media is NOT a publishable "P" resource — it has a
 * multipart upload pipeline, descriptive-metadata PATCH, archive/restore, replace-file, and usage
 * lookup. List/detail/archive/restore reuse the shared CRUD hooks (the generic admin endpoints
 * match: GET /admin/media, GET/POST /admin/media/:id/(archive|restore)); the upload/replace/usages
 * actions are media-specific and wired here. There is NO duplicate fetch logic.
 *
 * Authorization is ROLE-based on the backend (media.routes.ts) — all three CMS roles may manage
 * media; there is no seeded `media.*` permission. `MEDIA_ROLES` drives permission-aware affordances.
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { adminResource } from '@/constants/api-endpoints';
import { get, getList, patch, uploadFile, uploadFiles } from '@/lib/api/http';
import { apiClient } from '@/lib/api/client';
import type { ApiSingleResponse } from '@/types/api';
import { invalidateResource, invalidateDetail } from '@/lib/query';
import type { ListQuery } from '@/types/api';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import { ROLE_KEYS } from '@/constants/permissions';
import type { MediaAsset, MediaBulkUploadResult, MediaMetaInput, MediaReplaceResult, MediaUsage } from './types';

export const MEDIA_RESOURCE = 'media';

/** All three CMS roles may manage media (media.routes.ts). */
export const MEDIA_ROLES: string[] = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

const mediaPath = (id: string, action: string) => `${adminResource(MEDIA_RESOURCE).detail(id)}/${action}`;

/** Upload one file with progress. Reuses the shared multipart helper (POST /admin/media). */
export function useUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, meta, onProgress }: { file: File; meta?: MediaMetaInput; onProgress?: (pct: number) => void }) => {
      const fields: Record<string, string> = {};
      if (meta?.title) fields.title = meta.title;
      if (meta?.alt_text) fields.alt_text = meta.alt_text;
      if (meta?.caption) fields.caption = meta.caption;
      return uploadFile<MediaAsset>(adminResource(MEDIA_RESOURCE).create, file, fields, onProgress);
    },
    onSuccess: () => void invalidateResource(queryClient, MEDIA_RESOURCE),
  });
}

/** Upload many files in one request (POST /admin/media/bulk-upload). */
export function useBulkUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => uploadFiles<MediaBulkUploadResult>(`${adminResource(MEDIA_RESOURCE).list}/bulk-upload`, files),
    onSuccess: () => void invalidateResource(queryClient, MEDIA_RESOURCE),
  });
}

/** Update descriptive metadata (PATCH /admin/media/:id). */
export function useUpdateMediaMeta() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, meta }: { id: string; meta: MediaMetaInput }) => patch<MediaAsset, MediaMetaInput>(adminResource(MEDIA_RESOURCE).update(id), meta),
    onSuccess: (_data, { id }) => {
      void invalidateResource(queryClient, MEDIA_RESOURCE);
      void invalidateDetail(queryClient, MEDIA_RESOURCE, id);
      toast.success('Media updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/** Replace the file bytes — creates a new asset and chains the old one (POST /admin/media/:id/replace-file). */
export function useReplaceMediaFile() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, file, onProgress }: { id: string; file: File; onProgress?: (pct: number) => void }) => {
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.post<ApiSingleResponse<MediaReplaceResult>>(mediaPath(id, 'replace-file'), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      return res.data.data;
    },
    onSuccess: (_data, { id }) => {
      void invalidateResource(queryClient, MEDIA_RESOURCE);
      void invalidateDetail(queryClient, MEDIA_RESOURCE, id);
      toast.success('File replaced. A new asset was created and the old one retained.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/** Where an asset is referenced (GET /admin/media/:id/usages). */
export function useMediaUsages(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [MEDIA_RESOURCE, 'usages', id ?? ''],
    queryFn: () => get<MediaUsage[]>(mediaPath(id as string, 'usages')),
    enabled: Boolean(id) && enabled,
    staleTime: 30_000,
  });
}

/** Recent media for previews etc. (re-export for callers that prefer the raw fetch). */
export const fetchMediaPage = (query?: ListQuery) => getList<MediaAsset>(adminResource(MEDIA_RESOURCE).list, query);
