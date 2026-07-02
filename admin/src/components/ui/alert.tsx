import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const META: Record<AlertTone, { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: 'border-info/30 bg-info/5 text-info' },
  success: { icon: CheckCircle2, classes: 'border-success/30 bg-success/5 text-success' },
  warning: { icon: AlertTriangle, classes: 'border-warning/30 bg-warning/5 text-warning' },
  danger: { icon: XCircle, classes: 'border-danger/30 bg-danger/5 text-danger' },
};

/** Inline, persistent alert banner (distinct from transient toasts). */
export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, classes } = META[tone];
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-md border p-3', classes, className)}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        {title ? <p className="font-medium text-foreground">{title}</p> : null}
        {children ? <div className="text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  );
}
