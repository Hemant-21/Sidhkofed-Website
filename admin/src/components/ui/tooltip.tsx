'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const SIDE_CLASSES: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

/**
 * Lightweight tooltip shown on hover AND keyboard focus (accessibility). Wires
 * `aria-describedby` so assistive tech announces the description.
 */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md animate-fade-in',
            SIDE_CLASSES[side],
            className,
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
