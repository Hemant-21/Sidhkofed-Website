'use client';

/**
 * Syncs UI state (filters, page, search, ordering) to the URL query string so
 * list views are shareable/bookmarkable and survive refresh. Reads via Next's
 * `useSearchParams`, writes via the router. The single place list state ↔ URL.
 */

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface UseQueryParamsApi {
  params: Record<string, string>;
  get: (key: string) => string | null;
  /** Merge updates into the URL; `null`/'' removes a key. Resets to page 1 by default. */
  set: (updates: Record<string, string | number | boolean | null | undefined>, opts?: { resetPage?: boolean }) => void;
  remove: (...keys: string[]) => void;
  clear: () => void;
}

export function useQueryParams(): UseQueryParamsApi {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo(() => {
    const out: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }, [searchParams]);

  const commit = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const set = useCallback<UseQueryParamsApi['set']>(
    (updates, opts) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      if (opts?.resetPage !== false && !('page' in updates)) next.delete('page');
      commit(next);
    },
    [searchParams, commit],
  );

  const remove = useCallback<UseQueryParamsApi['remove']>(
    (...keys) => {
      const next = new URLSearchParams(searchParams.toString());
      keys.forEach((k) => next.delete(k));
      commit(next);
    },
    [searchParams, commit],
  );

  const clear = useCallback(() => commit(new URLSearchParams()), [commit]);

  return {
    params,
    get: (key) => searchParams.get(key),
    set,
    remove,
    clear,
  };
}
