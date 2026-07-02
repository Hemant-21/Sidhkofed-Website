import { Skeleton } from '@/components/feedback/skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
