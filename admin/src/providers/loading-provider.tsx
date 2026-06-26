'use client';

/**
 * LoadingProvider — a global, ref-counted busy indicator for app-wide blocking
 * operations (e.g. a multi-step action outside React Query). Most loading should
 * use React Query's own states + Skeletons; this is the escape hatch for true
 * full-screen waits. Ref-counting means concurrent callers compose correctly.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { FullPageLoader } from '@/components/feedback/full-page-loader';

interface LoadingContextValue {
  isLoading: boolean;
  /** Begin a blocking operation; returns a stop() to call when done. */
  begin: (label?: string) => () => void;
  /** Run an async task with the global overlay shown for its duration. */
  withLoading: <T>(task: () => Promise<T>, label?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [label, setLabel] = useState<string | undefined>();
  const labelRef = useRef<string | undefined>();

  const begin = useCallback((nextLabel?: string) => {
    labelRef.current = nextLabel;
    setLabel(nextLabel);
    setCount((c) => c + 1);
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      setCount((c) => Math.max(0, c - 1));
    };
  }, []);

  const withLoading = useCallback(
    async <T,>(task: () => Promise<T>, nextLabel?: string): Promise<T> => {
      const stop = begin(nextLabel);
      try {
        return await task();
      } finally {
        stop();
      }
    },
    [begin],
  );

  const value = useMemo<LoadingContextValue>(
    () => ({ isLoading: count > 0, begin, withLoading }),
    [count, begin, withLoading],
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {count > 0 ? <FullPageLoader label={label} overlay /> : null}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used within <LoadingProvider>.');
  return ctx;
}
