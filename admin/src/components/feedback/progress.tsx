import { cn } from '@/utils/cn';

export interface ProgressProps {
  /** 0–100. Omit/undefined for an indeterminate bar. */
  value?: number;
  className?: string;
  label?: string;
}

/** Accessible progress bar (determinate or indeterminate). */
export function Progress({ value, className, label }: ProgressProps) {
  const isIndeterminate = value === undefined;
  const clamped = isIndeterminate ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isIndeterminate ? undefined : clamped}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn(
          'h-full rounded-full bg-primary transition-[width] duration-300',
          isIndeterminate && 'w-1/3 animate-pulse',
        )}
        style={isIndeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}
