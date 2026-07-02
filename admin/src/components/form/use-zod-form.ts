'use client';

/**
 * Thin wrapper around React Hook Form wired to a Zod schema. Standardizes the
 * resolver + sensible defaults so every form is validated the same way. The form
 * SYSTEM is generic — no module schemas live here; callers pass their own schema.
 */

import { useForm, type UseFormProps, type UseFormReturn, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

export function useZodForm<TValues extends FieldValues>(
  schema: ZodType<TValues>,
  options?: Omit<UseFormProps<TValues>, 'resolver'>,
): UseFormReturn<TValues> {
  return useForm<TValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    mode: 'onTouched',
    ...options,
  });
}
