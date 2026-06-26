/**
 * Route-level loading skeleton for the Knowledge Centre segment.
 */
import { Skeleton } from '@/components/feedback/skeleton';

export default function KnowledgeCentreLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}
