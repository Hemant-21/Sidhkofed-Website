'use client';

/**
 * Mobile navigation drawer. Slides in from the left on small screens, traps focus,
 * closes on Escape/overlay/navigation. Reuses the same SidebarNav as desktop so
 * navigation stays single-sourced.
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { Brand } from './brand';
import { SidebarNav } from './sidebar-nav';

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50 animate-overlay-show" aria-hidden="true" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col border-r border-border bg-surface shadow-xl animate-slide-in-right"
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <SidebarNav onNavigate={onClose} />
      </div>
    </div>,
    document.body,
  );
}
