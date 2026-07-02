import { cn } from '@/utils/cn';
import { humanizeEnum } from '@/utils/format';

type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Map highlight types (codex §9) to a tone, and render a labelled badge. */
const HIGHLIGHT_TONE: Record<string, Tone> = {
  new: 'info',
  latest: 'primary',
  important: 'warning',
  urgent: 'danger',
  featured: 'accent',
};

export function HighlightBadge({ type, className }: { type: string | null | undefined; className?: string }) {
  if (!type) return null;
  return (
    <Badge tone={HIGHLIGHT_TONE[type] ?? 'neutral'} className={className}>
      {humanizeEnum(type)}
    </Badge>
  );
}

/** Event/tender/procurement status → tone. Status text is never color-only (WCAG). */
const STATUS_TONE: Record<string, Tone> = {
  scheduled: 'info',
  upcoming: 'info',
  ongoing: 'success',
  completed: 'neutral',
  postponed: 'warning',
  cancelled: 'danger',
  open: 'success',
  closed: 'neutral',
  awarded: 'primary',
  active: 'success',
  upcoming_period: 'info',
};

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return null;
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} className={className}>
      {humanizeEnum(status)}
    </Badge>
  );
}
