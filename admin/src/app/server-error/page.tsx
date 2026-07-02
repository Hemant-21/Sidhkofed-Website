import type { Metadata } from 'next';
import Link from 'next/link';
import { ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

export const metadata: Metadata = { title: 'Server error' };

/** Standalone 500 route. Runtime errors are handled by error.tsx; this is the
 *  addressable status page (e.g. linked from infrastructure error pages). */
export default function ServerErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        <ServerCrash className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-danger">500</p>
        <h1 className="text-lg font-semibold text-foreground">Server error</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The server ran into a problem completing your request. Please try again shortly.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href={ROUTES.dashboard}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
