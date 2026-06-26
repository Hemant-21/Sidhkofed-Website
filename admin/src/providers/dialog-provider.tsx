'use client';

/**
 * DialogProvider — imperative confirmation system. Any component can `await
 * confirm({...})` and get a boolean, without rendering its own modal. Specialized
 * intents (delete/archive/restore/publish/unpublish) are thin presets over the
 * same primitive (consumed via `useConfirmDialog`). Built on the accessible Dialog.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button, type ButtonVariant } from '@/components/ui/button';

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual treatment of the confirm button. */
  tone?: 'primary' | 'danger';
}

interface ActiveDialog extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const [pending, setPending] = useState(false);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setActive({ ...options, resolve });
    });
  }, []);

  const close = useCallback(
    (result: boolean) => {
      if (!active) return;
      active.resolve(result);
      setActive(null);
      setPending(false);
    },
    [active],
  );

  const value = useMemo<DialogContextValue>(() => ({ confirm }), [confirm]);

  const confirmVariant: ButtonVariant = active?.tone === 'danger' ? 'danger' : 'primary';

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Dialog
        open={active !== null}
        onClose={() => close(false)}
        title={active?.title}
        size="sm"
        dismissible={!pending}
        footer={
          active ? (
            <>
              <Button variant="ghost" onClick={() => close(false)} disabled={pending}>
                {active.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                variant={confirmVariant}
                isLoading={pending}
                onClick={() => {
                  setPending(true);
                  close(true);
                }}
              >
                {active.confirmLabel ?? 'Confirm'}
              </Button>
            </>
          ) : null
        }
      >
        {active?.description ? (
          <p className="text-sm text-muted-foreground">{active.description}</p>
        ) : null}
      </Dialog>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within <DialogProvider>.');
  return ctx;
}
