'use client';

import { useMemo, useState } from 'react';
import { DEBOUNCE_MS } from '@/constants/app';
import { useDebounce } from './use-debounce';

export interface UseSearchApi {
  /** Raw input value (bind to the SearchInput). */
  query: string;
  setQuery: (value: string) => void;
  /** Debounced value (pass to the API/query key). */
  debouncedQuery: string;
  clear: () => void;
}

/**
 * Search-box state with built-in debounce. Keeps the input responsive while only
 * the debounced value drives network requests (lightweight payloads, codex §14).
 */
export function useSearch(initial = '', delay = DEBOUNCE_MS): UseSearchApi {
  const [query, setQuery] = useState(initial);
  const debouncedQuery = useDebounce(query, delay);
  return useMemo(
    () => ({ query, setQuery, debouncedQuery, clear: () => setQuery('') }),
    [query, debouncedQuery],
  );
}
