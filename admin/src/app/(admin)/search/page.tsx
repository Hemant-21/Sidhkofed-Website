/**
 * `/search` — the dedicated Global Search results page (Phase 15.2). URL-driven and
 * server-side. `SearchPage` reads the query string via `useSearchParams`, so it is
 * wrapped in a Suspense boundary per the Next.js App Router requirement.
 */

import { Suspense } from 'react';
import { SearchPage } from '@/features/search';
import { FullPageLoader } from '@/components/feedback';

export default function Search() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <SearchPage />
    </Suspense>
  );
}
