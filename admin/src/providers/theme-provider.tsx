'use client';

/**
 * ThemeProvider — light/dark with `system` follow + persisted preference. This is
 * a frontend display preference only (no backend dependency); it toggles the
 * `dark` class on <html> to flip the CSS-variable design tokens. Respects the OS
 * setting when preference is `system`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS } from '@/constants/app';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({
  children,
  defaultPreference = 'system',
}: {
  children: ReactNode;
  defaultPreference?: ThemePreference;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(defaultPreference);
  const [theme, setTheme] = useState<ResolvedTheme>('light');

  // Hydrate the stored preference once.
  useEffect(() => {
    const stored =
      typeof window !== 'undefined'
        ? (window.localStorage.getItem(STORAGE_KEYS.theme) as ThemePreference | null)
        : null;
    if (stored) setPreferenceState(stored);
  }, []);

  // Resolve + apply whenever preference (or OS, when following) changes.
  useEffect(() => {
    const resolve = () => {
      const next = preference === 'system' ? systemTheme() : preference;
      setTheme(next);
      applyTheme(next);
    };
    resolve();
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', resolve);
    return () => mq.removeEventListener('change', resolve);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEYS.theme, pref);
  }, []);

  const toggle = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, theme, setPreference, toggle }),
    [preference, theme, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>.');
  return ctx;
}
