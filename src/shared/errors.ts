/**
 * Typed application errors mapped 1:1 to the API spec §1.4 error contract.
 *
 * Services and validators throw these; the error-handler middleware is the only
 * place that turns them into the single error envelope. Never hand-craft error JSON
 * elsewhere (docs/foundation/04-coding-standards.md §4–§5).
 *
 *   code                    -> HTTP status
 *   validation_error        -> 422
 *   authentication_required -> 401
 *   permission_denied       -> 403
 *   not_found               -> 404
 *   conflict                -> 409
 *   protected_record        -> 409
 *   rate_limited            -> 429
 *   unsupported_file_type   -> 415
 *   (malformed request)     -> 400
 */
export type ErrorCode =
  | 'validation_error'
  | 'authentication_required'
  | 'permission_denied'
  | 'not_found'
  | 'conflict'
  | 'protected_record'
  | 'rate_limited'
  | 'unsupported_file_type'
  | 'payload_too_large'
  | 'bad_request'
  | 'internal_error';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  validation_error: 422,
  authentication_required: 401,
  permission_denied: 403,
  not_found: 404,
  conflict: 409,
  protected_record: 409,
  rate_limited: 429,
  unsupported_file_type: 415,
  payload_too_large: 413,
  bad_request: 400,
  internal_error: 500,
};

/** Field-level validation details: `{ field: ["message", ...] }`. */
export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly fields?: FieldErrors;
  /** When false, the error handler logs at error level and hides the message in prod. */
  readonly expose: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    options: { fields?: FieldErrors; expose?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code];
    this.fields = options.fields;
    this.expose = options.expose ?? code !== 'internal_error';
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(fields: FieldErrors, message = 'Validation failed.') {
    super('validation_error', message, { fields });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required.') {
    super('authentication_required', message);
  }
}

export class PermissionError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super('permission_denied', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super('not_found', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict.') {
    super('conflict', message);
  }
}

export class ProtectedRecordError extends AppError {
  constructor(message = 'This record is linked and cannot be deleted.') {
    super('protected_record', message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Try again later.') {
    super('rate_limited', message);
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor(message = 'Unsupported file type.') {
    super('unsupported_file_type', message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Request payload is too large.') {
    super('payload_too_large', message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Malformed request.') {
    super('bad_request', message);
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
