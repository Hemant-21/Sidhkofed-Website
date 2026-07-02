'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visual error state (the Form field wires aria-invalid + messages). */
  invalid?: boolean;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leftAddon, rightAddon, type = 'text', ...props },
  ref,
) {
  const base = cn(
    'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    'disabled:cursor-not-allowed disabled:opacity-50',
    invalid ? 'border-danger focus-visible:ring-danger' : 'border-input',
    (leftAddon || rightAddon) && 'rounded-none',
    className,
  );

  if (leftAddon || rightAddon) {
    return (
      <div
        className={cn(
          'flex w-full items-center overflow-hidden rounded-md border',
          invalid ? 'border-danger' : 'border-input',
          'focus-within:ring-2 focus-within:ring-ring',
        )}
      >
        {leftAddon ? (
          <span className="flex items-center pl-3 text-muted-foreground">{leftAddon}</span>
        ) : null}
        <input
          ref={ref}
          type={type}
          aria-invalid={invalid || undefined}
          className={cn(base, 'border-0 focus-visible:ring-0 focus-visible:ring-offset-0')}
          {...props}
        />
        {rightAddon ? (
          <span className="flex items-center pr-3 text-muted-foreground">{rightAddon}</span>
        ) : null}
      </div>
    );
  }

  return <input ref={ref} type={type} aria-invalid={invalid || undefined} className={base} {...props} />;
});
