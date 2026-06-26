/**
 * Route-level loading skeleton for the Toolkits segment (App Router streaming fallback).
 */
import { Skeleton } from '@/components/feedback/skeleton';

export default function ToolkitsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
