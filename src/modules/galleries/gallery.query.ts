/**
 * Query-string parsing for the PUBLIC gallery list endpoint → framework-free filters + allow-listed
 * ordering. Unknown ordering → 422; unknown filter keys → 422 (API spec §1.4).
 *
 * Public filters (API spec §5 galleries): `show_on_homepage`. Ordering: `display_order,-published_at`.
 * Admin gallery listing keeps its own controller-level parsing (publication_state/search).
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import {
  GALLERY_ORDERING_FIELDS,
  type GalleryOrderingField,
  type GalleryPublicListFilters,
} from './gallery.repository';

const PUBLIC_FILTER_KEYS = ['show_on_homepage'] as const;

export function parseGalleryPublicFilters(req: Request): GalleryPublicListFilters {
  const q = req.query;
  assertKnownQueryKeys(q, PUBLIC_FILTER_KEYS);
  return { showOnHomepage: parseBooleanFlag(q.show_on_homepage, 'show_on_homepage') };
}

const DEFAULT = { field: 'display_order' as GalleryOrderingField, direction: 'asc' as const };

export function parseGalleryPublicOrdering(req: Request): { field: GalleryOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, GALLERY_ORDERING_FIELDS, DEFAULT);
  return { field: ob.field as GalleryOrderingField, direction: ob.direction };
}
