import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

/** 404 — unknown route. (Reserved module routes resolve here until built.) */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="text-lg font-semibold text-foreground">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or hasn’t been built yet.
        </p>
      </div>
      <Button asChild>
        <Link href={ROUTES.dashboard}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
