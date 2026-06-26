import { cn } from '@/utils/cn';

/** Loading placeholder. `animate-pulse` is disabled under prefers-reduced-motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden="true" />;
}

/** A grid of card skeletons for listing loading states. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4">
          <Skeleton className="mb-3 h-40 w-full" />
          <Skeleton className="mb-2 h-4 w-20" />
          <Skeleton className="mb-2 h-5 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
