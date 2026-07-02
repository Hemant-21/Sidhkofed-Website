import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Container } from './container';

export interface Crumb {
  label: string;
  href?: string;
}

/** Accessible breadcrumb trail. The last crumb is the current page (aria-current). */
export function Breadcrumbs({ items, homeLabel = 'Home' }: { items: Crumb[]; homeLabel?: string }) {
  const all: Crumb[] = [{ label: homeLabel, href: '/' }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="border-b border-border bg-surface">
      <Container className="py-3">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {all.map((crumb, i) => {
            const isLast = i === all.length - 1;
            return (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-primary hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground" aria-current={isLast ? 'page' : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </Container>
    </nav>
  );
}
