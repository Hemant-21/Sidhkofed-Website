import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names and de-conflict Tailwind utilities. The single
 * class-composition helper used by every component (`cn('p-2', cond && 'p-4')`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
