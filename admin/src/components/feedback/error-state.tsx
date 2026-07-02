'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  /** Any thrown value; ApiError messages are surfaced safely. */
  error?: unknown;
  title?: string;
  /** Retry handler (e.g. React Query `refetch`). Shows a retry button when set. */
  onRetry?: () => void;
  className?: string;
}

/** Inline error panel for failed queries/sections. Never leaks raw stack/details. */
export function ErrorState({ error, title = 'Something went wrong', onRetry, className }: ErrorStateProps) {
  const message =
    error instanceof ApiError
      ? error.message
      : 'We could not complete that request. Please try again.';

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/30 bg-danger/5 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
