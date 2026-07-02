/**
 * Query-string parsing for the PUBLIC video list endpoint → framework-free filters + allow-listed
 * ordering. Unknown ordering → 422; unknown filter keys → 422 (API spec §1.4).
 *
 * Public filters (API spec §5 videos): `show_on_homepage`. Ordering: `display_order,-published_at`.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import {
  VIDEO_ORDERING_FIELDS,
  type VideoOrderingField,
  type VideoPublicListFilters,
} from './video.repository';

const PUBLIC_FILTER_KEYS = ['show_on_homepage'] as const;

export function parseVideoPublicFilters(req: Request): VideoPublicListFilters {
  const q = req.query;
  assertKnownQueryKeys(q, PUBLIC_FILTER_KEYS);
  return { showOnHomepage: parseBooleanFlag(q.show_on_homepage, 'show_on_homepage') };
}

const DEFAULT = { field: 'display_order' as VideoOrderingField, direction: 'asc' as const };

export function parseVideoPublicOrdering(req: Request): { field: VideoOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, VIDEO_ORDERING_FIELDS, DEFAULT);
  return { field: ob.field as VideoOrderingField, direction: ob.direction };
}
