import { Skeleton } from '@/components/feedback/skeleton';

export default function SuccessStoriesLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
