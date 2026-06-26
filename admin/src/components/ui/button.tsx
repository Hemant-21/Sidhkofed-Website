'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/feedback/spinner';
import { Slot } from './slot';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border bg-transparent hover:bg-muted text-foreground',
  ghost: 'bg-transparent hover:bg-muted text-foreground',
  danger: 'bg-danger text-danger-foreground hover:bg-danger/90',
  link: 'bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2',
  icon: 'h-10 w-10 p-0',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a spinner and disable interaction. */
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Render as the single child element (e.g. a <Link>) instead of a <button>. */
  asChild?: boolean;
}

/**
 * The base action component. Variants/sizes are design-system tokens; never style
 * a raw <button> elsewhere. Accessible: real <button>, focus ring, disabled state,
 * spinner announced via Spinner's status role.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    asChild = false,
    disabled,
    children,
    type,
    ...props
  },
  ref,
) {
  const classes = cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner size="sm" className="text-current" /> : leftIcon}
      {children}
      {!isLoading ? rightIcon : null}
    </button>
  );
});
