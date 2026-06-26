/**
 * Typed request helpers over the shared axios instance. These unwrap the standard
 * envelope (API spec §1.4) so callers get `data`/`{items,pagination}` directly and
 * never re-implement fetch logic. Errors arrive already normalized to `ApiError`.
 */

import type { AxiosRequestConfig } from 'axios';
import type {
  ApiListResponse,
  ApiSingleResponse,
  ListQuery,
  Pagination,
} from '@/types/api';
import { apiClient, rawRequest } from './client';
import { normalizeListQuery, withQuery } from '@/utils/query-string';

/** Unwrapped paginated result. */
export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

/** GET a single resource → `data`. */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.get<ApiSingleResponse<T>>(url, config);
  return res.data.data;
}

/** GET a paginated list → `{ items, pagination }`. Query is normalized + serialized. */
export async function getList<T>(
  url: string,
  query?: ListQuery,
  config?: AxiosRequestConfig,
): Promise<PaginatedResult<T>> {
  const res = await apiClient.get<ApiListResponse<T>>(
    withQuery(url, normalizeListQuery(query)),
    config,
  );
  return { items: res.data.data, pagination: res.data.pagination };
}

/** POST → `data` (create/actions). */
export async function post<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.post<ApiSingleResponse<T>>(url, body, config);
  return res.data.data;
}

/** PATCH (partial update) → `data`. */
export async function patch<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.patch<ApiSingleResponse<T>>(url, body, config);
  return res.data.data;
}

/** PUT → `data` (settings). */
export async function put<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.put<ApiSingleResponse<T>>(url, body, config);
  return res.data.data;
}

/** DELETE → void / `data`. */
export async function del<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.delete<ApiSingleResponse<T>>(url, config);
  return res.data?.data as T;
}

/**
 * Multipart upload helper (media endpoints, API spec §6/§7). Builds FormData from
 * a file + optional fields and reports progress. Returns the created resource.
 */
export async function uploadFile<T>(
  url: string,
  file: File,
  fields?: Record<string, string | Blob>,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  if (fields) {
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
  }
  const res = await apiClient.post<ApiSingleResponse<T>>(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return res.data.data;
}

/** Upload many files in one request (bulk-upload endpoints). */
export async function uploadFiles<T>(
  url: string,
  files: File[],
  fields?: Record<string, string | Blob>,
): Promise<T> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  if (fields) {
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
  }
  const res = await apiClient.post<ApiSingleResponse<T>>(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

/** Fetch a binary payload (e.g. enquiry XLSX export). Returns the Blob. */
export async function getBlob(url: string, config?: AxiosRequestConfig): Promise<Blob> {
  const res = await rawRequest<Blob>({ ...config, url, method: 'GET', responseType: 'blob' });
  return res.data;
}
