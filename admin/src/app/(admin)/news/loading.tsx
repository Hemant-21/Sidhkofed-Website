/**
 * Route-level loading skeleton for the News segment.
 */
import { Skeleton } from '@/components/feedback/skeleton';

export default function NewsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
