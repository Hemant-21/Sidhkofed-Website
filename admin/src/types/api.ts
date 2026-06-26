/**
 * The single API envelope (API spec §1.4). Every backend response — public,
 * admin, auth — uses exactly one of these shapes. The frontend mirrors them so
 * the whole app speaks one contract.
 */

/** Present on every response. */
export interface ResponseMeta {
  request_id?: string;
  message?: string;
  [key: string]: unknown;
}

/** Pagination block on list responses. `page_size` defaults 20, capped 100. */
export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

/** Success — single resource. */
export interface ApiSingleResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

/** Success — paginated list. */
export interface ApiListResponse<T> {
  success: true;
  data: T[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/** The fixed backend error-code set (API spec §1.4). */
export type ApiErrorCode =
  | 'validation_error'
  | 'authentication_required'
  | 'permission_denied'
  | 'not_found'
  | 'conflict'
  | 'protected_record'
  | 'rate_limited'
  | 'unsupported_file_type'
  | 'malformed_request'
  // client-synthesized codes (never sent by the server):
  | 'network_error'
  | 'timeout'
  | 'offline'
  | 'unknown_error';

/** Per-field validation messages (only present for `validation_error`). */
export type FieldErrors = Record<string, string[]>;

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  fields?: FieldErrors;
}

/** Failure — any 4xx/5xx (or synthesized client error). */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  meta: ResponseMeta;
}

export type ApiResponse<T> = ApiSingleResponse<T> | ApiListResponse<T> | ApiErrorResponse;

/** Standard list query the API layer understands across modules. */
export interface ListQuery {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  [filter: string]: string | number | boolean | undefined | null | Array<string | number>;
}
