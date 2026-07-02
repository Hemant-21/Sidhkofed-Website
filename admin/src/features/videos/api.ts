'use client';

/**
 * Videos data layer. Standard list/detail/create/update/lifecycle come from the shared CRUD hooks
 * against the `videos` resource — no bespoke fetch logic. This module only adds the video-SPECIFIC
 * helper that isn't part of the generic "P" pattern: the stateless YouTube URL pre-check the form
 * calls for instant feedback (POST /admin/videos/validate-url).
 *
 * Videos are authorized with the shared `content.*` permission set (video.routes.ts), so the keys
 * are reused from the events feature rather than redefined.
 */

import { useMutation } from '@tanstack/react-query';
import { post } from '@/lib/api/http';
import { ApiError } from '@/lib/api/errors';
import type { YouTubeValidation } from './types';

export const VIDEOS_RESOURCE = 'videos';

/** Videos reuse the shared content RBAC keys (video.routes.ts maps to `content.*`). */
export { CONTENT_PERMS } from '@/features/events/permissions';

/**
 * Stateless YouTube URL validator (POST /admin/videos/validate-url). Returns the derived
 * youtube_id / canonical_url / thumbnail_url on success, or throws an ApiError (422) the form maps
 * onto the `youtube_url` field. Creates no record.
 */
export function useValidateYouTubeUrl() {
  return useMutation<YouTubeValidation, ApiError, string>({
    mutationFn: (youtube_url: string) => post<YouTubeValidation, { youtube_url: string }>('/admin/videos/validate-url', { youtube_url }),
  });
}
