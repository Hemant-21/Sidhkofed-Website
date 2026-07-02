'use client';

/**
 * Sync filter/pagination state to the URL query string so listings are shareable,
 * bookmarkable, and back-button friendly (a government-portal expectation). Reads
 * from the live URL and writes via the App Router without scrolling the page.
 */

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback((key: string): string => searchParams.get(key) ?? '', [searchParams]);

  /** Merge updates into the current query. Empty/null values remove the key. Resets to page 1
   *  unless `page` is one of the updated keys. */
  const setParams = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      if (!('page' in updates)) next.delete('page');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearParams = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  return { get, setParams, clearParams, searchParams };
}
