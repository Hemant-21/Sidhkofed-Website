import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/** Section header with optional "view all" link. Renders a real <h2> for hierarchy. */
export function SectionHeading({
  title,
  viewAllHref,
  viewAllLabel,
  as: As = 'h2',
}: {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <As className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        <span className="border-l-4 border-primary pl-3">{title}</span>
      </As>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {viewAllLabel ?? 'View all'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
