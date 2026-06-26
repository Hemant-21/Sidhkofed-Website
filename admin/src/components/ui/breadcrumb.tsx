'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface Crumb {
  label: string;
  href?: string;
}

/** Accessible breadcrumb trail (nav + aria-current on the final crumb). */
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${crumb.label}-${i}`}>
              <li>
                {crumb.href && !last ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className={cn(last && 'font-medium text-foreground')}>
                    {crumb.label}
                  </span>
                )}
              </li>
              {!last ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
