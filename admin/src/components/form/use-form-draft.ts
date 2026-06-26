'use client';

/**
 * Optional draft autosave for forms. Persists the watched form values to
 * localStorage under a namespaced key so an interrupted edit can be restored.
 * This is a frontend convenience only — it does NOT publish or create server
 * records (the backend owns the real Draft publication state).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { STORAGE_KEYS } from '@/constants/app';
import { DEBOUNCE_MS } from '@/constants/app';

export interface UseFormDraftApi {
  savedAt: string | null;
  restore: () => void;
  clear: () => void;
}

export function useFormDraft<T extends FieldValues>(
  key: string,
  form: UseFormReturn<T>,
  options: { enabled?: boolean } = {},
): UseFormDraftApi {
  const enabled = options.enabled ?? true;
  const storageKey = `${STORAGE_KEYS.draftPrefix}${key}`;
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Debounced persistence of form values.
  useEffect(() => {
    if (!enabled) return;
    const subscription = form.watch((values) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(values));
          setSavedAt(new Date().toISOString());
        } catch {
          /* storage full / unavailable — ignore */
        }
      }, DEBOUNCE_MS);
    });
    return () => {
      subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, form, storageKey]);

  const restore = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) form.reset(JSON.parse(raw) as T);
    } catch {
      /* ignore malformed draft */
    }
  }, [form, storageKey]);

  const clear = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setSavedAt(null);
  }, [storageKey]);

  return { savedAt, restore, clear };
}
