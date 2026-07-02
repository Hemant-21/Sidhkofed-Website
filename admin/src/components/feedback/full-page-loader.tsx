import { cn } from '@/utils/cn';
import { Spinner } from './spinner';

export interface FullPageLoaderProps {
  label?: string;
  /** Render as a semi-transparent overlay above existing content. */
  overlay?: boolean;
}

/** Centered loader for route transitions, session restore, and blocking waits. */
export function FullPageLoader({ label = 'Loading…', overlay = false }: FullPageLoaderProps) {
  return (
    <div
      className={cn(
        'flex min-h-[60vh] w-full flex-col items-center justify-center gap-3',
        overlay && 'fixed inset-0 z-[90] min-h-screen bg-background/70 backdrop-blur-sm',
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner size="lg" label={label} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
