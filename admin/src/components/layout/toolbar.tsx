import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Horizontal toolbar: filters/search on the left, actions on the right. */
export function Toolbar({
  start,
  end,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { start?: ReactNode; end?: ReactNode }) {
  return (
    <div
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">{start}</div>
      {end ? <div className="flex flex-wrap items-center gap-2">{end}</div> : null}
    </div>
  );
}

/** Sticky action bar that pins to the bottom of a scroll area (e.g. form save). */
export function ActionBar({
  children,
  className,
  sticky = false,
}: {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-border bg-surface px-4 py-3',
        sticky && 'sticky bottom-0 z-10',
        className,
      )}
    >
      {children}
    </div>
  );
}
