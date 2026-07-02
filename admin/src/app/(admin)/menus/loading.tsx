import { Skeleton } from '@/components/feedback/skeleton';

export default function MenusLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
