'use client';

import { useEffect, useState } from 'react';
import { DEBOUNCE_MS } from '@/constants/app';

/** Returns a debounced copy of `value` that updates after `delay` ms of quiet. */
export function useDebounce<T>(value: T, delay = DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
