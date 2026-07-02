import { cn } from '@/utils/cn';

/** Surface card container used by content cards and panels. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface text-surface-foreground shadow-sm', className)}>
      {children}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-4 sm:p-5', className)}>{children}</div>;
}
