import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { ApiError, normalizeError } from './errors';

function axiosErrorWithResponse(status: number, body: unknown): AxiosError {
  const err = new AxiosError('Request failed');
  err.response = {
    status,
    statusText: '',
    data: body,
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return err;
}

describe('normalizeError', () => {
  it('passes through an existing ApiError', () => {
    const original = new ApiError({ code: 'not_found', message: 'x', status: 404 });
    expect(normalizeError(original)).toBe(original);
  });

  it('maps a server validation envelope to ApiError with fields', () => {
    const err = normalizeError(
      axiosErrorWithResponse(422, {
        success: false,
        error: {
          code: 'validation_error',
          message: 'Validation failed.',
          fields: { title_en: ['This field is required.'] },
        },
        meta: { request_id: 'req_1' },
      }),
    );
    expect(err.code).toBe('validation_error');
    expect(err.isValidation).toBe(true);
    expect(err.status).toBe(422);
    expect(err.fields?.title_en?.[0]).toContain('required');
    expect(err.requestId).toBe('req_1');
  });

  it('derives a code from status when the body has no error block', () => {
    const err = normalizeError(axiosErrorWithResponse(403, {}));
    expect(err.code).toBe('permission_denied');
    expect(err.isClientError).toBe(true);
  });

  it('maps a missing response to a network error', () => {
    const err = normalizeError(new AxiosError('Network Error'));
    expect(err.code).toBe('network_error');
    expect(err.status).toBeNull();
  });

  it('wraps unknown throwables', () => {
    expect(normalizeError(new Error('boom')).code).toBe('unknown_error');
  });
});
