'use client';

/**
 * Minimal `Slot` — merges its props/className onto a single child element instead
 * of rendering its own DOM node. Lets components expose `asChild` (e.g. render a
 * Button as a Next.js <Link>) without pulling in a dependency.
 */

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface SlotProps {
  children: ReactNode;
  [key: string]: unknown;
}

export function Slot({ children, className, ...props }: SlotProps & { className?: string }) {
  if (!isValidElement(children)) {
    if (Children.count(children) > 1) Children.only(null);
    return null;
  }
  const child = children as ReactElement<{ className?: string }>;
  return cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(className, child.props.className),
  } as Record<string, unknown>);
}
