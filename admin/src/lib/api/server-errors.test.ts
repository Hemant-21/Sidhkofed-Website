import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import {
  errorMessage,
  extractFieldErrors,
  fieldErrorMessage,
  toFormSubmitResult,
} from './server-errors';

const validation = new ApiError({
  code: 'validation_error',
  message: 'Validation failed.',
  status: 422,
  fields: { title_en: ['This field is required.'] },
});

const conflict = new ApiError({ code: 'conflict', message: 'Already exists.', status: 409 });

describe('server-error mapping', () => {
  it('maps a 422 onto per-field errors', () => {
    expect(toFormSubmitResult(validation)).toEqual({
      ok: false,
      fieldErrors: { title_en: ['This field is required.'] },
    });
    expect(extractFieldErrors(validation)).toEqual({ title_en: ['This field is required.'] });
    expect(fieldErrorMessage(validation, 'title_en')).toBe('This field is required.');
    expect(fieldErrorMessage(validation, 'missing')).toBeUndefined();
  });

  it('maps a non-validation error onto a form-level message', () => {
    expect(toFormSubmitResult(conflict)).toEqual({ ok: false, formError: 'Already exists.' });
    expect(extractFieldErrors(conflict)).toEqual({});
    expect(errorMessage(conflict)).toBe('Already exists.');
  });

  it('normalizes an arbitrary thrown value', () => {
    const result = toFormSubmitResult(new Error('boom'));
    expect(result.ok).toBe(false);
    expect(result.formError).toBe('boom');
    expect(extractFieldErrors('nope')).toEqual({});
  });
});
