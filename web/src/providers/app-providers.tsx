'use client';

/**
 * Single client provider tree mounted once at the root layout. Keeps the rest of
 * the app as Server Components by default; only this subtree is client-side.
 */

import { LanguageProvider } from './language-provider';
import { QueryProvider } from './query-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </QueryProvider>
  );
}
