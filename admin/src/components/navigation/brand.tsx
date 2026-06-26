import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/constants/routes';
import { APP } from '@/constants/app';

/** Product wordmark/logo lockup. Placeholder mark until the official logo lands. */
export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href={ROUTES.dashboard}
      className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${APP.name} home`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Leaf className="h-5 w-5" aria-hidden="true" />
      </span>
      {!collapsed ? (
        <span className={cn('flex flex-col leading-none')}>
          <span className="text-sm font-semibold text-foreground">{APP.shortName}</span>
          <span className="text-[11px] text-muted-foreground">CMS Admin</span>
        </span>
      ) : null}
    </Link>
  );
}
