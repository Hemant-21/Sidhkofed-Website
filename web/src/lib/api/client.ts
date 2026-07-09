/**
 * Client-side public API access for interactive islands (filters, pagination,
 * search). A single axios instance points at the browser-facing base path, which
 * Next.js rewrites same-origin to the backend (so the public CORS allow-list and
 * the HttpOnly admin cookie are never involved). No auth — public namespace only.
 */

'use client';

import axios, { AxiosError, type AxiosInstance } from 'axios';
import { env } from '@/config/env';
import type { ListResult, PaginatedResponse, SuccessResponse, ErrorResponse } from '@/lib/types/api';

export const publicClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

export class ClientApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    /** Per-field validation messages (only present for `validation_error`). */
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ClientApiError';
  }
}

function normalize(err: unknown): ClientApiError {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 0;
    const body = err.response?.data as ErrorResponse | undefined;
    return new ClientApiError(
      status,
      body?.error?.code ?? (status === 0 ? 'network_error' : 'error'),
      body?.error?.message ?? err.message,
      body?.error?.fields,
    );
  }
  return new ClientApiError(0, 'error', err instanceof Error ? err.message : 'Unexpected error');
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

function cleanParams(params?: QueryParams): QueryParams | undefined {
  if (!params) return undefined;
  const out: QueryParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}

/** GET a paginated list → `{ items, pagination }`. */
export async function fetchList<T>(path: string, params?: QueryParams): Promise<ListResult<T>> {
  try {
    const { data } = await publicClient.get<PaginatedResponse<T>>(path, { params: cleanParams(params) });
    return { items: data.data, pagination: data.pagination };
  } catch (err) {
    throw normalize(err);
  }
}

/** GET a single resource → unwrapped `data`. */
export async function fetchOne<T>(path: string, params?: QueryParams): Promise<T> {
  try {
    const { data } = await publicClient.get<SuccessResponse<T>>(path, { params: cleanParams(params) });
    return data.data;
  } catch (err) {
    throw normalize(err);
  }
}

/**
 * POST a body to a public endpoint → unwrapped `data` (e.g. the enquiry submission form). Errors
 * are normalized the same way as GET, including per-field validation messages.
 */
export async function postOne<T, B = unknown>(path: string, body: B): Promise<T> {
  try {
    const { data } = await publicClient.post<SuccessResponse<T>>(path, body);
    return data.data;
  } catch (err) {
    throw normalize(err);
  }
}
