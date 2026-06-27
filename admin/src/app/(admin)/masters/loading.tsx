import { Skeleton } from '@/components/feedback/skeleton';

export default function MastersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="flex gap-6">
        <Skeleton className="h-96 w-56 shrink-0" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
