import { FullPageLoader } from '@/components/feedback/full-page-loader';

/** Route-level Suspense fallback for the root segment. */
export default function Loading() {
  return <FullPageLoader label="Loading…" />;
}
