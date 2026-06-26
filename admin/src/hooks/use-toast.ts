'use client';

import { useContext } from 'react';
import { ToastContext, type ToastContextValue } from '@/providers/toast-provider';

/** Imperative toast helpers: `toast.success(...)`, `toast.promise(...)`, etc. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>.');
  return ctx;
}
