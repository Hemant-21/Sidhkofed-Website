'use client';

/**
 * Galleries data layer. Standard list/detail/create/update/lifecycle use the shared CRUD hooks
 * against the `galleries` resource (the standard admin "P" pattern). The IMAGE sub-resource is
 * gallery-specific (add / update / remove / reorder), so those mutations are wired here over the
 * shared typed HTTP helpers — no duplicate fetch logic. Every image endpoint returns the full
 * updated gallery, so we seed the detail cache and invalidate lists (image_count changes).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminResource } from '@/constants/api-endpoints';
import { get, post, patch, del } from '@/lib/api/http';
import { queryKeys } from '@/constants/query-keys';
import { invalidateResource } from '@/lib/query';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import type {
  GalleryDetail,
  GalleryImageInput,
  GalleryImageUpdateInput,
  GalleryReorderInput,
} from './types';

export const GALLERIES_RESOURCE = 'galleries';

export { GALLERY_PERMS } from './permissions';

const base = adminResource(GALLERIES_RESOURCE);
const imagesPath = (id: string) => `${base.detail(id)}/images`;
const imagePath = (id: string, imageId: string) => `${imagesPath(id)}/${encodeURIComponent(imageId)}`;

/** Typed detail fetch for callers outside the CRUD hook. */
export const fetchGallery = (id: string) => get<GalleryDetail>(base.detail(id));

/** Shared cache wiring for every image mutation: seed detail + invalidate lists. */
function useImageMutation<TVars>(
  run: (galleryId: string, vars: TVars) => Promise<GalleryDetail>,
  successMessage: string,
) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ galleryId, vars }: { galleryId: string; vars: TVars }) => run(galleryId, vars),
    onSuccess: (gallery) => {
      queryClient.setQueryData(queryKeys.resource(GALLERIES_RESOURCE).detail(gallery.id), gallery);
      void invalidateResource(queryClient, GALLERIES_RESOURCE);
      toast.success(successMessage);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/** Add an existing media asset to the gallery (display order auto-assigned when omitted). */
export function useAddGalleryImage() {
  return useImageMutation<GalleryImageInput>(
    (galleryId, body) => post<GalleryDetail, GalleryImageInput>(imagesPath(galleryId), body),
    'Image added.',
  );
}

/** Update one gallery image (caption / display order). */
export function useUpdateGalleryImage() {
  return useImageMutation<{ imageId: string; body: GalleryImageUpdateInput }>(
    (galleryId, { imageId, body }) =>
      patch<GalleryDetail, GalleryImageUpdateInput>(imagePath(galleryId, imageId), body),
    'Image updated.',
  );
}

/** Remove one image from the gallery (the underlying media asset is not deleted). */
export function useRemoveGalleryImage() {
  return useImageMutation<{ imageId: string }>(
    (galleryId, { imageId }) => del<GalleryDetail>(imagePath(galleryId, imageId)),
    'Image removed.',
  );
}

/** Persist a new image order (move up/down). */
export function useReorderGalleryImages() {
  return useImageMutation<GalleryReorderInput>(
    (galleryId, body) => post<GalleryDetail, GalleryReorderInput>(`${imagesPath(galleryId)}/reorder`, body),
    'Images reordered.',
  );
}
