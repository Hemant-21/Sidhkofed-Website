import { Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

type Tone = 'info' | 'warning' | 'success' | 'danger';

const config: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: 'border-info/30 bg-info/10 text-foreground', Icon: Info },
  warning: { cls: 'border-warning/40 bg-warning/10 text-foreground', Icon: AlertTriangle },
  success: { cls: 'border-success/30 bg-success/10 text-foreground', Icon: CheckCircle2 },
  danger: { cls: 'border-danger/30 bg-danger/10 text-foreground', Icon: XCircle },
};

/** Inline message banner. `role` is status/alert per tone for assistive tech. */
export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { cls, Icon } = config[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-md border p-4 text-sm', cls, className)}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-1' : undefined}>{children}</div>}
      </div>
    </div>
  );
}
