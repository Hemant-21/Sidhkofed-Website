'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';

/** 403 affordance shown when a user lacks permission for a page/section. */
export function ForbiddenState({
  title = 'Access denied',
  description = 'You do not have permission to view this area. If you believe this is an error, contact your administrator.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
        <ShieldAlert className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="outline">
        <Link href={ROUTES.dashboard}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
