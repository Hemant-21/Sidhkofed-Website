'use client';

import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';

/** Access the current session, status, and login/logout actions. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>.');
  }
  return ctx;
}
