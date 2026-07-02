import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Breadcrumb, type Crumb } from '@/components/ui/breadcrumb';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned actions (e.g. a "Create" button gated by <Can>). */
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  className?: string;
}

/** Standard page heading: breadcrumb + title + description + actions. */
export function PageHeader({ title, description, actions, breadcrumbs, className }: PageHeaderProps) {
  return (
    <header className={cn('space-y-3', className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumb items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
