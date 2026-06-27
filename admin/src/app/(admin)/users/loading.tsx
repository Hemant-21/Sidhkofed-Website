import { Skeleton } from '@/components/feedback/skeleton';

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-36" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
