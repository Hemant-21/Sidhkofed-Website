import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

/**
 * Layout containers and structural primitives. Composable building blocks for
 * every future page so no module re-implements page scaffolding.
 */

/** Constrains content width + responsive horizontal padding. */
export function PageContainer({
  className,
  size = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & { size?: 'default' | 'wide' | 'narrow' | 'full' }) {
  const widths = {
    narrow: 'max-w-3xl',
    default: 'max-w-7xl',
    wide: 'max-w-[96rem]',
    full: 'max-w-none',
  } as const;
  return <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', widths[size], className)} {...props} />;
}

/** Vertical content rhythm wrapper. */
export function ContentWrapper({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-6 py-6', className)} {...props} />;
}

/** A titled content section with optional description + actions. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

/** Simple bordered panel (lighter than Card; for grouping form fields, etc.). */
export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-border bg-background p-4', className)} {...props} />;
}

/** Responsive auto-fit grid. */
export function GridLayout({
  className,
  columns = 3,
  ...props
}: HTMLAttributes<HTMLDivElement> & { columns?: 1 | 2 | 3 | 4 }) {
  const cols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  } as const;
  return <div className={cn('grid gap-4', cols[columns], className)} {...props} />;
}

/** Two-pane split layout (e.g. form + preview). Stacks on mobile. */
export function SplitLayout({
  left,
  right,
  ratio = 'half',
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  ratio?: 'half' | 'wide-left' | 'wide-right';
  className?: string;
}) {
  const grid = {
    half: 'lg:grid-cols-2',
    'wide-left': 'lg:grid-cols-[2fr_1fr]',
    'wide-right': 'lg:grid-cols-[1fr_2fr]',
  } as const;
  return (
    <div className={cn('grid grid-cols-1 gap-6', grid[ratio], className)}>
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}

/** Centered, minimal layout for auth/standalone pages. */
export function EmptyLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12', className)}>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
