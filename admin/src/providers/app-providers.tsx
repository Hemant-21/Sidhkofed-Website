'use client';

/**
 * Single composition of every global provider, mounted once at the root layout.
 * Order matters: Theme (display) → Query (data) → Toast (notifications, used by
 * everything) → Auth (session) → Dialog (confirmations) → Loading (overlay).
 * Providers only — no business logic lives here.
 */

import type { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';
import { ToastProvider } from './toast-provider';
import { AuthProvider } from './auth-provider';
import { DialogProvider } from './dialog-provider';
import { LoadingProvider } from './loading-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ToastProvider>
          <AuthProvider>
            <DialogProvider>
              <LoadingProvider>{children}</LoadingProvider>
            </DialogProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
