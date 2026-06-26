/**
 * Auth service — the only place that calls the `/auth/*` endpoints. Wraps the
 * backend contract (API spec §2) and keeps the in-memory token store in sync.
 * Consumed by the AuthProvider; never imported directly by feature components.
 */

import { AUTH_ENDPOINTS } from '@/constants/api-endpoints';
import type { ApiSingleResponse } from '@/types/api';
import type { AuthSession, AuthUser, LoginCredentials } from '@/types/auth';
import { apiClient } from '@/lib/api/client';
import { tokenStore } from '@/lib/api/token-store';

export const authService = {
  /** Sign in. Sets the refresh cookie (server) + stores access token/user (client). */
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    const res = await apiClient.post<ApiSingleResponse<AuthSession>>(
      AUTH_ENDPOINTS.login,
      credentials,
      { skipAuthRefresh: true } as never,
    );
    const session = res.data.data;
    tokenStore.set(session.access_token, session.user);
    return session.user;
  },

  /** Sign out. Idempotent server-side; always clears the client session. */
  async logout(): Promise<void> {
    try {
      await apiClient.post(AUTH_ENDPOINTS.logout, undefined, { skipAuthRefresh: true } as never);
    } finally {
      tokenStore.clear();
    }
  },

  /** Fetch the current user (uses the access token). */
  async me(): Promise<AuthUser> {
    const res = await apiClient.get<ApiSingleResponse<AuthUser>>(AUTH_ENDPOINTS.me);
    return res.data.data;
  },
};
