/**
 * The single response envelope used by every endpoint (public/admin/auth).
 *
 * API spec §1.4 / coding-standards §7. There is exactly one success shape, one list
 * shape, and one error shape. Controllers return through these builders; they never
 * assemble envelopes inline.
 */
import type { ErrorCode, FieldErrors } from './errors';

export interface ResponseMeta {
  request_id: string;
  message?: string;
  [key: string]: unknown;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface PaginatedEnvelope<T> {
  success: true;
  data: T[];
  pagination: Pagination;
  meta: ResponseMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    fields?: FieldErrors;
  };
  meta: ResponseMeta;
}

/** Correlation id source — `req.id` is widened to string|number by pino-http types. */
export type RequestId = string | number;

function buildMeta(requestId: RequestId, message?: string): ResponseMeta {
  const id = String(requestId);
  return message ? { request_id: id, message } : { request_id: id };
}

/** Single-resource success: `{ success, data, meta }`. */
export function success<T>(data: T, requestId: RequestId, message?: string): SuccessEnvelope<T> {
  return { success: true, data, meta: buildMeta(requestId, message) };
}

/** List success: `{ success, data, pagination, meta }`. */
export function paginated<T>(
  data: T[],
  pagination: Pagination,
  requestId: RequestId,
  message?: string,
): PaginatedEnvelope<T> {
  return { success: true, data, pagination, meta: buildMeta(requestId, message) };
}

/** Failure: `{ success:false, error, meta }`. `fields` only for validation errors. */
export function failure(
  code: ErrorCode,
  message: string,
  requestId: RequestId,
  fields?: FieldErrors,
): ErrorEnvelope {
  const error: ErrorEnvelope['error'] = { code, message };
  if (fields) error.fields = fields;
  return { success: false, error, meta: { request_id: String(requestId) } };
}
