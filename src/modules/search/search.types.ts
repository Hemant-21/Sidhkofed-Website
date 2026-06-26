/**
 * Global Search types (Phase 13 — api-specification.md §5/§14).
 *
 * The searchable surfaces are EXACTLY the content tables that carry a metadata `search_vector`
 * column (the FTS migration). `success_story` is intentionally excluded: that table is not yet
 * implemented (Phase 2). When it lands, add its `search_vector` + GIN index and append it here and
 * to the migration — nothing else in this module changes.
 */

/** The metadata-search content surfaces (every table with a `search_vector`). */
export const CONTENT_TYPES = [
  'event',
  'news',
  'programme',
  'document',
  'official_communication',
  'tender',
  'procurement_update',
  'page',
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

/** Minimum / maximum query length (api-specification.md §1.5: 2–120 characters). */
export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 120;

/**
 * Framework-free, already-validated search input. The controller/validator produces this; the
 * service and repository consume it. `contentTypes` is always a non-empty subset of CONTENT_TYPES
 * (defaults to all when the client sends no `content_type`).
 */
export interface SearchFilters {
  q: string;
  contentTypes: ContentType[];
  commodity?: string;
  district?: string;
  programme?: string;
  year?: number;
}
