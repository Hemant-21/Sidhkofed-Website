'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/format';

/** Bar shown when rows are selected; the caller supplies permission-gated actions. */
export function BulkActions({
  count,
  onClear,
  children,
  className,
}: {
  count: number;
  onClear: () => void;
  children?: ReactNode;
  className?: string;
}) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5',
        className,
      )}
    >
      <span className="text-sm font-medium text-foreground">
        {formatNumber(count)} selected
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        <X className="h-4 w-4" aria-hidden="true" />
        Clear
      </button>
    </div>
  );
}
