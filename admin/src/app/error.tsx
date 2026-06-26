'use client';

/**
 * Segment-level error boundary (Next.js). Catches render/runtime errors in the
 * route subtree and offers a reset. Never exposes the raw error to the user.
 */

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Hook for a real logger/telemetry sink.
    if (process.env.NODE_ENV === 'development') console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          An unexpected error occurred. You can try again; if it persists, contact your administrator.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
