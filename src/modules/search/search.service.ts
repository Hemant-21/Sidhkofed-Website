/**
 * Search service (Phase 13). Owns the read orchestration for global search:
 *   1. delegate the ranked, paginated metadata query to the repository (public vs admin visibility),
 *   2. resolve cover-media references in one batch (no N+1),
 *   3. map rows to the lightweight result DTO.
 *
 * Search is a read-only aggregator: it writes nothing and — per api-specification.md / the Phase-13
 * brief — does NOT emit audit-log entries for queries. Individual modules remain the source of truth;
 * results are references, never full entities. No business state is mutated, so there is no lifecycle,
 * RBAC-state, or media-usage obligation here (RBAC is enforced at the route for admin search).
 */
import type { SearchFilters } from './search.types';
import { searchRepository } from './search.repository';
import { toSearchResultDto, type SearchResultDto } from './search.dto';

export interface SearchPage {
  items: SearchResultDto[];
  total: number;
}

interface PageWindow {
  skip: number;
  take: number;
}

async function run(filters: SearchFilters, page: PageWindow, isPublic: boolean): Promise<SearchPage> {
  const { rows, total } = await searchRepository.search(filters, {
    skip: page.skip,
    take: page.take,
    public: isPublic,
  });

  if (rows.length === 0) return { items: [], total };

  const coverIds = [...new Set(rows.map((r) => r.cover_media_id).filter((id): id is string => id !== null))];
  const coverMedia = await searchRepository.findCoverMediaRefs(coverIds);

  return { items: rows.map((r) => toSearchResultDto(r, coverMedia)), total };
}

/** Public global search — published, publicly-visible, non-archived, due records only. */
function publicSearch(filters: SearchFilters, page: PageWindow): Promise<SearchPage> {
  return run(filters, page, /* isPublic */ true);
}

/** Admin global search — all publication states across every permitted surface (RBAC at the route). */
function adminSearch(filters: SearchFilters, page: PageWindow): Promise<SearchPage> {
  return run(filters, page, /* isPublic */ false);
}

export const searchService = { publicSearch, adminSearch };
