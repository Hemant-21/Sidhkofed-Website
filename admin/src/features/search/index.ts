/**
 * Global Search feature (Phase 15.2). Public surface: the provider + shortcut hook,
 * the dedicated results page, and the reusable result components/hooks. Search is
 * entirely server-side (admin search endpoint) — no client index or filtering.
 */

export { SearchProvider, useGlobalSearch } from './search-provider';
export { SearchPage } from './search-page';
export { SearchModal } from './components/search-modal';
export { SearchResults } from './components/search-results';
export { SearchResultCard } from './components/search-result-card';
export { SearchFilters, type SearchFilterValue } from './components/search-filters';
export {
  useSearchResults,
  useGroupedResults,
  groupResultsByType,
  isSearchable,
  type ResultGroup,
} from './hooks';
export { searchAdmin, buildSearchQuery } from './api';
export {
  CONTENT_TYPE_META,
  CONTENT_TYPE_ORDER,
  adminHrefForResult,
  type ContentTypeMeta,
} from './content-type-meta';
