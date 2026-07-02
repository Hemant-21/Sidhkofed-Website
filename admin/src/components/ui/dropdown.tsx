'use client';

/**
 * Accessible dropdown menu. The trigger element itself becomes the toggle — its menu ARIA
 * (aria-haspopup/expanded/controls) and click handler are merged onto it via {@link Slot},
 * so there is NO wrapper <button> around the trigger (avoids nested interactive elements).
 * Keyboard support (Escape closes), outside-click dismiss, and role=menu/menuitem are kept.
 * Composed by the Topbar user menu, row action menus in DataTable, etc.
 *
 * The `trigger` must therefore be a single FOCUSABLE element (e.g. a <Button> or <button>) so
 * keyboard users can open the menu.
 */

import {
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@/utils/cn';
import { useClickOutside } from '@/hooks/use-click-outside';
import { Slot } from './slot';

export interface DropdownItem {
  /** Optional — omitted for `separator` items. */
  label?: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  /** Render as a destructive action. */
  danger?: boolean;
  disabled?: boolean;
  /** Render a separator instead of an item (label ignored). */
  separator?: boolean;
}

export interface DropdownProps {
  /** A single focusable element (e.g. a <Button>); the toggle ARIA + onClick are merged onto it. */
  trigger: ReactElement;
  items: DropdownItem[];
  align?: 'start' | 'end';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'end', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div
      className="relative inline-block"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <Slot
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </Slot>
      {open ? (
        <div
          role="menu"
          id={menuId}
          className={cn(
            'absolute z-50 mt-2 min-w-[12rem] overflow-hidden rounded-md border border-border bg-surface p-1 shadow-lg animate-content-show',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {items.map((item, i) =>
            item.separator ? (
              <div key={i} role="separator" className="my-1 h-px bg-border" />
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm transition-colors',
                  'focus:outline-none focus-visible:bg-muted hover:bg-muted',
                  'disabled:pointer-events-none disabled:opacity-50',
                  item.danger ? 'text-danger' : 'text-surface-foreground',
                )}
              >
                {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                <span className="flex-1">{item.label}</span>
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
