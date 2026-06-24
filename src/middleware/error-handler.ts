/**
 * Global error handler — the ONLY place errors become the response envelope.
 *
 * Maps typed AppErrors (and a few well-known framework/library errors) to the §1.4
 * error contract. Unexpected errors become a generic 500 whose internal detail is
 * logged but never leaked. Validation, business, and auth errors all flow through
 * here (deliverable §6).
 */
import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';
import { logger } from '@/shared/logger';
import { failure } from '@/shared/envelope';
import {
  AppError,
  ValidationError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  isAppError,
  type FieldErrors,
} from '@/shared/errors';

const errorLog = logger.child({ component: 'error-handler' });

/** Convert a ZodError into the `{ field: [messages] }` shape. */
function zodToFields(err: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/** Best-effort translation of known errors into a typed AppError. */
function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;

  if (err instanceof ZodError) {
    return new ValidationError(zodToFields(err));
  }

  // Express/body-parser malformed JSON.
  if (err instanceof SyntaxError && 'body' in err) {
    return new BadRequestError('Malformed JSON in request body.');
  }

  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return new ConflictError('A record with these unique values already exists.');
      case 'P2025':
        return new NotFoundError('Resource not found.');
      default:
        break;
    }
  }

  // Unknown / unexpected → opaque 500.
  return new AppError('internal_error', 'An unexpected error occurred.', {
    expose: false,
    cause: err,
  });
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // Express requires the 4-arg signature to treat this as an error handler.
  _next: NextFunction,
): void => {
  const appError = toAppError(err);
  const requestId = String(req.id ?? 'req_unknown');

  if (appError.statusCode >= 500) {
    errorLog.error(
      { err: appError.cause ?? appError, request_id: requestId, code: appError.code },
      'Unhandled error',
    );
  } else {
    errorLog.warn(
      { request_id: requestId, code: appError.code, status: appError.statusCode },
      appError.message,
    );
  }

  const message = appError.expose ? appError.message : 'An unexpected error occurred.';
  res.status(appError.statusCode).json(failure(appError.code, message, requestId, appError.fields));
};
