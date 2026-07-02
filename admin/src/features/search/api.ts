/**
 * Global Search data access (Phase 15.2). Calls the authenticated admin search
 * endpoint, which the backend evaluates over ALL publication states for the CMS
 * reader roles (the public endpoint is the website's). Search is entirely
 * server-side — this is a thin fetcher; there is no client-side index or filter.
 */

import { getList, type PaginatedResult } from '@/lib/api/http';
import { SEARCH_ENDPOINTS } from '@/constants/api-endpoints';
import type { ListQuery } from '@/types/api';
import type { SearchQuery, SearchResult } from '@/types/search';

/** Strip empty params and forward ONLY the backend allow-listed search keys. */
export function buildSearchQuery(input: SearchQuery): ListQuery {
  const query: ListQuery = { q: input.q };
  if (input.content_type) query.content_type = input.content_type;
  if (input.commodity) query.commodity = input.commodity;
  if (input.district) query.district = input.district;
  if (input.programme) query.programme = input.programme;
  if (input.year) query.year = input.year;
  if (input.page) query.page = input.page;
  if (input.page_size) query.page_size = input.page_size;
  return query;
}

export function searchAdmin(input: SearchQuery): Promise<PaginatedResult<SearchResult>> {
  return getList<SearchResult>(SEARCH_ENDPOINTS.admin, buildSearchQuery(input));
}
