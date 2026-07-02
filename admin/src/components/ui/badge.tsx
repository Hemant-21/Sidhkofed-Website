import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { TONE_CLASSES, type StatusTone } from '@/constants/status';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  /** Show a leading dot (status indicator — not color-only thanks to the label). */
  dot?: boolean;
}

/** Compact label/chip. Tones map to semantic tokens (consistent across themes). */
export function Badge({ className, tone = 'default', dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
