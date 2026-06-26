/**
 * Server-error → UI mapping helpers. The backend is the authoritative validator
 * (foundation §coding-standards). These turn any thrown value into the shapes the
 * reusable <Form> wrapper and field components consume, so modules never re-parse
 * the 422 `fields` map themselves.
 */

import type { FieldErrors } from '@/types/api';
import type { FormSubmitResult } from '@/types/form';
import { normalizeError } from './errors';

/**
 * Convert any thrown error into a `FormSubmitResult` the <Form> wrapper maps onto
 * fields (validation_error) or the top-level banner (everything else).
 *
 *   const result = await create.mutateAsync(values).then(() => ({ ok: true }))
 *     .catch(toFormSubmitResult);
 */
export function toFormSubmitResult(error: unknown): FormSubmitResult {
  const apiError = normalizeError(error);
  if (apiError.isValidation && apiError.fields) {
    return { ok: false, fieldErrors: apiError.fields };
  }
  return { ok: false, formError: apiError.message };
}

/** Per-field messages for a validation error; `{}` for any other failure. */
export function extractFieldErrors(error: unknown): FieldErrors {
  const apiError = normalizeError(error);
  return apiError.isValidation && apiError.fields ? apiError.fields : {};
}

/** First message for a given snake_case field, if the server flagged it. */
export function fieldErrorMessage(error: unknown, field: string): string | undefined {
  return extractFieldErrors(error)[field]?.[0];
}

/** A safe, human-readable top-level message for toasts/banners. */
export function errorMessage(error: unknown): string {
  return normalizeError(error).message;
}
