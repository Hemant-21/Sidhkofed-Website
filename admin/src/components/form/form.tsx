'use client';

/**
 * `<Form>` — the reusable form shell. Wraps RHF's FormProvider, runs the submit
 * handler, and maps server-side validation errors (the 422 `fields` map) back onto
 * the matching RHF fields (API field keys are snake_case). Surfaces a top-level
 * error banner for non-field errors and tracks the submit state for disabling.
 */

import { type ReactNode } from 'react';
import {
  FormProvider,
  type FieldValues,
  type UseFormReturn,
  type SubmitHandler,
  type Path,
} from 'react-hook-form';
import { ApiError } from '@/lib/api/errors';
import type { FormSubmitResult } from '@/types/form';
import { Alert } from '@/components/ui/alert';

export interface FormProps<TValues extends FieldValues> {
  form: UseFormReturn<TValues>;
  /**
   * Submit handler. Throw an ApiError (or return a FormSubmitResult) to surface
   * server validation; on success, resolve normally.
   */
  onSubmit: (values: TValues) => Promise<FormSubmitResult | void> | void;
  children: ReactNode;
  className?: string;
}

export function Form<TValues extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
}: FormProps<TValues>) {
  const {
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  const applyFieldErrors = (fields?: Record<string, string[]>) => {
    if (!fields) return;
    for (const [key, messages] of Object.entries(fields)) {
      setError(key as Path<TValues>, { type: 'server', message: messages[0] });
    }
  };

  const submit: SubmitHandler<TValues> = async (values) => {
    try {
      const result = await onSubmit(values);
      if (result && !result.ok) {
        applyFieldErrors(result.fieldErrors);
        if (result.formError) setError('root.serverError', { type: 'server', message: result.formError });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isValidation) applyFieldErrors(err.fields);
        else setError('root.serverError', { type: 'server', message: err.message });
        return;
      }
      setError('root.serverError', { type: 'server', message: 'Something went wrong. Please try again.' });
    }
  };

  const rootError = errors.root?.serverError?.message as string | undefined;

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(submit)} className={className} noValidate>
        {rootError ? (
          <Alert tone="danger" className="mb-4" title="Could not save">
            {rootError}
          </Alert>
        ) : null}
        {children}
      </form>
    </FormProvider>
  );
}
