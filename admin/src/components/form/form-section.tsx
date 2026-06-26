import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Groups related fields under a heading with a responsive 1/2-column grid. */
export function FormSection({
  title,
  description,
  columns = 1,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  columns?: 1 | 2;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      )}
      <div className={cn('grid gap-4', columns === 2 && 'sm:grid-cols-2')}>{children}</div>
    </section>
  );
}

/** Standard form footer with submit/cancel slots. */
export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-2 pt-2', className)}>{children}</div>
  );
}
