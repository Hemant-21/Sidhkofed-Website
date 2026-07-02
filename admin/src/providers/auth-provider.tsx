'use client';

/**
 * AuthProvider — owns the client session lifecycle.
 *
 * Boot: calls `/auth/refresh` once (cookie-based) to restore a session silently
 * (API spec §1.2). Subscribes to the API layer's `unauthorized` event so a failed
 * refresh anywhere clears the session and routes to /login. Exposes the user,
 * status, and login/logout actions via context — consumed through `useAuth`.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthStatus, AuthUser, LoginCredentials } from '@/types/auth';
import { authService } from '@/services/auth.service';
import { restoreSession } from '@/lib/api/client';
import { tokenStore } from '@/lib/api/token-store';
import { authEvents } from '@/lib/api/auth-events';
import { ROUTES } from '@/constants/routes';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(() => tokenStore.getUser());
  const [status, setStatus] = useState<AuthStatus>('idle');
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Keep React state in sync with the imperative token store (e.g. silent refresh).
  useEffect(() => tokenStore.subscribe(setUser), []);

  // Restore the session once on mount.
  useEffect(() => {
    let active = true;
    setStatus('restoring');
    restoreSession()
      .then((token) => {
        if (!active) return;
        setStatus(token ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        if (active) setStatus('unauthenticated');
      });
    return () => {
      active = false;
    };
  }, []);

  // Terminal 401 anywhere → clear + bounce to login (preserving intended path).
  useEffect(() => {
    return authEvents.on('unauthorized', () => {
      tokenStore.clear();
      setStatus('unauthenticated');
      const current = pathnameRef.current;
      if (current && current !== ROUTES.login) {
        const next = encodeURIComponent(current);
        router.replace(`${ROUTES.login}?next=${next}`);
      }
    });
  }, [router]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const loggedIn = await authService.login(credentials);
    setStatus('authenticated');
    return loggedIn;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setStatus('unauthenticated');
    router.replace(ROUTES.login);
  }, [router]);

  const refreshUser = useCallback(async () => {
    const fresh = await authService.me();
    const token = tokenStore.getToken();
    if (token) tokenStore.set(token, fresh);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && user !== null,
      isLoading: status === 'idle' || status === 'restoring',
      login,
      logout,
      refreshUser,
    }),
    [user, status, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
