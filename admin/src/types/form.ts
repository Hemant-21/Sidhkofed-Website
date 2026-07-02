/**
 * Generic form-system types. The form system is built on React Hook Form + Zod;
 * these types describe the reusable wrapper contract, not any module's fields.
 */

import type { FieldErrors as ApiFieldErrors } from './api';

/** UI submission phases shared by the reusable Form wrapper. */
export type FormSubmitState = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Result the Form wrapper expects back from an async submit handler so it can map
 * server-side validation errors (422) onto individual fields.
 */
export interface FormSubmitResult {
  ok: boolean;
  /** snake_case field → messages, as returned by the API `validation_error`. */
  fieldErrors?: ApiFieldErrors;
  /** A top-level (non-field) error message to surface in the form banner. */
  formError?: string;
}

/** Draft-support metadata for forms that persist work-in-progress locally. */
export interface DraftMeta {
  key: string;
  savedAt: string | null;
}
