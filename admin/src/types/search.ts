/**
 * Global Search DTOs (Phase 15.2). Mirrors the backend search contract EXACTLY
 * (src/modules/search/search.types.ts + search.dto.ts). Search is server-side
 * only: the backend owns the query, ranking, visibility, and result payload — the
 * frontend never indexes or filters results client-side (codex §14).
 */

import type { MediaRef } from './common';

/**
 * The searchable content surfaces — EXACTLY the tables carrying a metadata
 * `search_vector` (the FTS migration). Adding a surface is a backend change first.
 */
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

/** Query-length bounds enforced by the backend (API spec §1.5: 2–120 chars). */
export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 120;

/** One lightweight search result (reference object only — never a full entity). */
export interface SearchResult {
  content_type: ContentType;
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary: string | null;
  publication_date: string | null;
  cover_media: MediaRef | null;
  public_url: string;
}

/**
 * The search query parameters accepted by the endpoints (allow-listed server-side;
 * anything else is rejected with 422). Mirrors `parseSearchFilters`.
 */
export interface SearchQuery {
  q: string;
  content_type?: string;
  commodity?: string;
  district?: string;
  programme?: string;
  year?: string;
  page?: number;
  page_size?: number;
}
