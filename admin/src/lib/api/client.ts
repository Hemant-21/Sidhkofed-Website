/**
 * The single axios instance + interceptors for the whole app. No component or
 * service constructs its own fetch/axios — all traffic flows through here so auth,
 * refresh, error normalization, and credentials are handled in exactly one place.
 *
 * Refresh flow (API spec §1.2/§2): on a 401 the response interceptor performs ONE
 * silent `/auth/refresh` (rotating cookie), de-duplicated across concurrent
 * failures, then replays the queued requests. If refresh fails, the session is
 * cleared and an `unauthorized` event tells the AuthProvider to redirect to login.
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/config/env';
import { AUTH_ENDPOINTS } from '@/constants/api-endpoints';
import type { AuthSession } from '@/types/auth';
import { tokenStore } from './token-store';
import { authEvents } from './auth-events';
import { normalizeError } from './errors';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  /** Opt a request out of the silent-refresh flow (used by auth endpoints). */
  skipAuthRefresh?: boolean;
}

/** Main instance — credentialed so the HttpOnly refresh cookie travels with it. */
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

/**
 * Bare instance used ONLY for the refresh call, so the refresh request itself is
 * never intercepted/retried (avoids infinite recursion).
 */
const refreshClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

// ── Request interceptor: attach the in-memory bearer token ───────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// ── Single-flight refresh, shared across concurrent 401s ─────────────────────
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  try {
    const { data } = await refreshClient.post<{ success: true; data: AuthSession }>(
      AUTH_ENDPOINTS.refresh,
    );
    const session = data.data;
    tokenStore.set(session.access_token, session.user);
    return session.access_token;
  } catch {
    tokenStore.clear();
    return null;
  }
}

function getRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ── Response interceptor: refresh-on-401 + error normalization ───────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    const isAuthEndpoint =
      config?.url === AUTH_ENDPOINTS.login ||
      config?.url === AUTH_ENDPOINTS.refresh ||
      config?.url === AUTH_ENDPOINTS.logout;

    if (status === 401 && config && !config._retry && !config.skipAuthRefresh && !isAuthEndpoint) {
      config._retry = true;
      const newToken = await getRefresh();
      if (newToken) {
        config.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient(config);
      }
      // Refresh failed → terminal: tell the app to sign out.
      authEvents.emit('unauthorized');
    }

    if (status === 403) {
      authEvents.emit('forbidden');
    }

    return Promise.reject(normalizeError(error));
  },
);

/** Directly run a refresh (used by AuthProvider on boot to restore the session). */
export function restoreSession(): Promise<string | null> {
  return getRefresh();
}

/** Low-level passthrough for callers that need raw config (e.g. blob downloads). */
export function rawRequest<T>(config: AxiosRequestConfig & { skipAuthRefresh?: boolean }) {
  return apiClient.request<T>(config);
}
