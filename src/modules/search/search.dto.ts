/**
 * Search result DTO + mapper (api-specification.md §5).
 *
 * Lightweight reference objects ONLY — the search response carries
 * `content_type, id, slug, title_en, title_hi, summary, publication_date, cover_media, public_url`
 * and never a full entity body. Individual modules remain the source of truth; `public_url` lets the
 * client navigate to the canonical detail route (matching each module's own `publicUrl` convention).
 */
import type { MediaRef } from '@/modules/institutions/institutions.dto';
import type { ContentType } from './search.types';
import type { SearchRow } from './search.repository';

export interface SearchResultDto {
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

/** Per-surface public route prefix — identical to each module's own `publicUrl` builder. */
const URL_PREFIX: Record<ContentType, string> = {
  event: '/events',
  news: '/news',
  programme: '/programmes',
  document: '/documents',
  official_communication: '/official-communications',
  tender: '/tenders',
  procurement_update: '/procurement-updates',
  page: '/pages',
};

export function publicUrlFor(type: ContentType, slug: string): string {
  return `${URL_PREFIX[type]}/${slug}`;
}

/** Map one ranked row + the resolved cover-media map to the API result shape. */
export function toSearchResultDto(row: SearchRow, coverMedia: Map<string, MediaRef>): SearchResultDto {
  return {
    content_type: row.content_type,
    id: row.id,
    slug: row.slug,
    title_en: row.title_en,
    title_hi: row.title_hi,
    summary: row.summary,
    publication_date: row.publication_date,
    cover_media: row.cover_media_id ? coverMedia.get(row.cover_media_id) ?? null : null,
    public_url: publicUrlFor(row.content_type, row.slug),
  };
}
