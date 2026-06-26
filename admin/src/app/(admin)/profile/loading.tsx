import { Skeleton } from '@/components/feedback/skeleton';

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-64 w-full max-w-2xl" />
      <Skeleton className="h-64 w-full max-w-2xl" />
    </div>
  );
}
