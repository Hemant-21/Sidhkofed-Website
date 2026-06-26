'use client';

import { useCallback, useMemo, useState } from 'react';

export interface UseBooleanApi {
  value: boolean;
  setTrue: () => void;
  setFalse: () => void;
  toggle: () => void;
  set: (value: boolean) => void;
}

/** Boolean state with stable helpers (modals, drawers, disclosure widgets). */
export function useBoolean(initial = false): UseBooleanApi {
  const [value, setValue] = useState(initial);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return useMemo(
    () => ({ value, setTrue, setFalse, toggle, set: setValue }),
    [value, setTrue, setFalse, toggle],
  );
}
