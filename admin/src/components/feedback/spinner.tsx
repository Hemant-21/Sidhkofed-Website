import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const SIZES = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' } as const;

export interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
  /** Accessible label; rendered visually hidden for screen readers. */
  label?: string;
}

/** Indeterminate loading spinner. Announces its purpose to assistive tech. */
export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <Loader2 className={cn('animate-spin text-muted-foreground', SIZES[size])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
