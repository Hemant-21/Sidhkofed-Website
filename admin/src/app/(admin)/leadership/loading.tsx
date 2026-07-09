import { Skeleton } from '@/components/feedback/skeleton';

export default function LeadershipLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
