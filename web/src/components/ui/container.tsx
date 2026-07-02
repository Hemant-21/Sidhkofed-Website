import { cn } from '@/utils/cn';

/** Centered max-width page container with responsive gutters. */
export function Container({
  className,
  id,
  children,
}: {
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return <div id={id} className={cn('mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}
