/**
 * Normalized API error. Every failure — server envelope, network drop, timeout,
 * offline — is converted into one `ApiError` so UI/error boundaries handle a
 * single shape. Sensitive details are never surfaced (security: "sensitive error
 * exposure"); only the backend's safe `message` + `code` reach the user.
 */

import { AxiosError } from 'axios';
import type { ApiErrorBody, ApiErrorCode, FieldErrors } from '@/types/api';

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: 'malformed_request',
  401: 'authentication_required',
  403: 'permission_denied',
  404: 'not_found',
  409: 'conflict',
  415: 'unsupported_file_type',
  422: 'validation_error',
  429: 'rate_limited',
};

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  validation_error: 'Please correct the highlighted fields.',
  authentication_required: 'Your session has expired. Please sign in again.',
  permission_denied: 'You do not have permission to perform this action.',
  not_found: 'The requested resource was not found.',
  conflict: 'This action conflicts with the current state of the record.',
  protected_record: 'This record is linked and cannot be modified that way.',
  rate_limited: 'Too many requests. Please try again later.',
  unsupported_file_type: 'That file type is not supported.',
  malformed_request: 'The request was invalid.',
  network_error: 'Network error. Check your connection and try again.',
  timeout: 'The request timed out. Please try again.',
  offline: 'You appear to be offline.',
  unknown_error: 'Something went wrong. Please try again.',
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  readonly fields?: FieldErrors;
  readonly requestId?: string;

  constructor(params: {
    code: ApiErrorCode;
    message: string;
    status?: number | null;
    fields?: FieldErrors;
    requestId?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status ?? null;
    this.fields = params.fields;
    this.requestId = params.requestId;
  }

  /** True for codes that should not be retried automatically. */
  get isClientError(): boolean {
    return this.status !== null && this.status >= 400 && this.status < 500;
  }

  get isValidation(): boolean {
    return this.code === 'validation_error';
  }
}

/** Build an ApiError from any thrown value (Axios or otherwise). */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    // Offline / no network.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return new ApiError({ code: 'offline', message: DEFAULT_MESSAGES.offline, status: null });
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ code: 'timeout', message: DEFAULT_MESSAGES.timeout, status: null });
    }
    if (!error.response) {
      return new ApiError({
        code: 'network_error',
        message: DEFAULT_MESSAGES.network_error,
        status: null,
      });
    }

    const status = error.response.status;
    const body = error.response.data as { error?: ApiErrorBody; meta?: { request_id?: string } };
    const serverError = body?.error;
    const code = serverError?.code ?? STATUS_TO_CODE[status] ?? 'unknown_error';
    return new ApiError({
      code,
      message: serverError?.message ?? DEFAULT_MESSAGES[code] ?? DEFAULT_MESSAGES.unknown_error,
      status,
      fields: serverError?.fields,
      requestId: body?.meta?.request_id,
    });
  }

  return new ApiError({
    code: 'unknown_error',
    message: error instanceof Error ? error.message : DEFAULT_MESSAGES.unknown_error,
    status: null,
  });
}

export { DEFAULT_MESSAGES as ERROR_MESSAGES };
