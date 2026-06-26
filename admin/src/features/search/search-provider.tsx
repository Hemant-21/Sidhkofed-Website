'use client';

/**
 * Global search provider (Phase 15.2). Owns the command-palette open state and the
 * Ctrl/Cmd+K shortcut, and mounts the modal once for the whole authenticated shell.
 * Any component opens search via `useGlobalSearch().open()` (the topbar button, the
 * dashboard shortcut, …). Mounted inside the authenticated AdminShell only — search
 * is an admin surface.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SearchModal } from './components/search-modal';

interface GlobalSearchValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const GlobalSearchContext = createContext<GlobalSearchValue | null>(null);

/** Ignore the shortcut while the user is typing in a field (except to toggle the palette). */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K toggles the palette from anywhere (including inside fields).
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggle();
        return;
      }
      // Bare "/" opens search when not typing elsewhere (convenience, never hijacks input).
      if (e.key === '/' && !isEditableTarget(e.target)) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle, open]);

  const value = useMemo<GlobalSearchValue>(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      <SearchModal open={isOpen} onClose={close} />
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch(): GlobalSearchValue {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) throw new Error('useGlobalSearch must be used within <SearchProvider>.');
  return ctx;
}
