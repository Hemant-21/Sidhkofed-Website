/**
 * In-memory access-token store.
 *
 * Security (task "never store JWT insecurely"): the short-lived ACCESS token lives
 * only in JS memory — never localStorage/sessionStorage — so it is not readable by
 * persistent XSS payloads and vanishes on tab close. The long-lived REFRESH token
 * is a Secure/HttpOnly/SameSite cookie owned by the backend (API spec §1.2) and is
 * never visible to JS at all. Session is restored on boot via `/auth/refresh`.
 */

import type { AuthUser } from '@/types/auth';

let accessToken: string | null = null;
let currentUser: AuthUser | null = null;

/** Subscribers notified when the session is set/cleared (e.g. AuthProvider). */
type Listener = (user: AuthUser | null) => void;
const listeners = new Set<Listener>();

export const tokenStore = {
  getToken(): string | null {
    return accessToken;
  },
  getUser(): AuthUser | null {
    return currentUser;
  },
  /** Set after login/refresh succeeds. */
  set(token: string, user: AuthUser): void {
    accessToken = token;
    currentUser = user;
    listeners.forEach((l) => l(user));
  },
  /** Replace just the token (silent refresh keeps the same user). */
  setToken(token: string): void {
    accessToken = token;
  },
  /** Clear on logout / failed refresh. */
  clear(): void {
    accessToken = null;
    currentUser = null;
    listeners.forEach((l) => l(null));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
