'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Native radio styled with the design-system accent. Group via shared `name`. */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="radio"
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer border-input accent-[hsl(var(--primary))]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});
