'use client';

/**
 * ToastProvider — accessible, dependency-free notification system. Holds the toast
 * queue + renders the live-region viewport. Exposes imperative helpers
 * (success/error/info/warning/promise) via context, surfaced through `useToast`.
 * Also registers a global handler so the API/error layers can raise toasts.
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
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { APP } from '@/constants/app';
import { cn } from '@/utils/cn';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastInput {
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastContextValue {
  show: (variant: ToastVariant, input: ToastInput) => string;
  success: (input: ToastInput | string) => string;
  error: (input: ToastInput | string) => string;
  info: (input: ToastInput | string) => string;
  warning: (input: ToastInput | string) => string;
  dismiss: (id: string) => void;
  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: ToastInput | string; success: ToastInput | string; error: ToastInput | string },
  ) => Promise<T>;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_META: Record<
  ToastVariant,
  { icon: typeof Info; classes: string; role: 'status' | 'alert' }
> = {
  success: { icon: CheckCircle2, classes: 'border-success/30 text-success', role: 'status' },
  error: { icon: XCircle, classes: 'border-danger/30 text-danger', role: 'alert' },
  warning: { icon: AlertTriangle, classes: 'border-warning/30 text-warning', role: 'alert' },
  info: { icon: Info, classes: 'border-info/30 text-info', role: 'status' },
};

function asInput(input: ToastInput | string): ToastInput {
  return typeof input === 'string' ? { title: input } : input;
}

let counter = 0;
const nextId = () => `toast-${Date.now()}-${counter++}`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (variant: ToastVariant, input: ToastInput): string => {
      const id = nextId();
      const duration = input.duration ?? APP.toastDuration;
      setToasts((prev) => [...prev, { id, variant, ...input }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  const helpers = useMemo(() => {
    const make = (variant: ToastVariant) => (input: ToastInput | string) =>
      show(variant, asInput(input));
    return {
      success: make('success'),
      error: make('error'),
      info: make('info'),
      warning: make('warning'),
    };
  }, [show]);

  const promise = useCallback<ToastContextValue['promise']>(
    async (p, msgs) => {
      const loadingId = show('info', asInput(msgs.loading));
      try {
        const result = await p;
        dismiss(loadingId);
        helpers.success(msgs.success);
        return result;
      } catch (err) {
        dismiss(loadingId);
        helpers.error(msgs.error);
        throw err;
      }
    },
    [show, dismiss, helpers],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ show, dismiss, promise, ...helpers }),
    [show, dismiss, promise, helpers],
  );

  // Register a module-level handler so non-React code (interceptors) can toast.
  useEffect(() => {
    registerToastHandler(value);
    return () => registerToastHandler(null);
  }, [value]);

  // Clear any pending timers on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => {
          const meta = VARIANT_META[toast.variant];
          const Icon = meta.icon;
          return (
            <div
              key={toast.id}
              role={meta.role}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-md border bg-surface p-3 shadow-lg animate-slide-in-right',
                meta.classes,
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-foreground">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="rounded-sm text-muted-foreground transition-colors hover:text-surface-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// ── Module-level bridge for non-component callers (e.g. global error handling) ─
let externalHandler: ToastContextValue | null = null;
function registerToastHandler(handler: ToastContextValue | null): void {
  externalHandler = handler;
}

/** Raise a toast from outside React (interceptors, query error handler). No-op if unmounted. */
export function notify(variant: ToastVariant, input: ToastInput | string): void {
  externalHandler?.[variant](input);
}
