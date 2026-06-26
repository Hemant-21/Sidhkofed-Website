'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MenuItem } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { MenuLink, menuHref } from './menu-link';

/**
 * Desktop primary navigation built from the backend header menu. Top-level items
 * with children render an accessible dropdown (button + `aria-expanded`, list of
 * links). Hover and keyboard focus both open the submenu.
 */
export function DesktopNav({ items }: { items: MenuItem[] }) {
  const { language } = useLanguage();
  return (
    <nav aria-label="Primary" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {items.map((item) =>
          item.children.length > 0 ? (
            <DropdownItem key={item.id} item={item} lang={language} />
          ) : (
            <li key={item.id}>
              <MenuLink
                item={item}
                lang={language}
                className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                activeClassName="bg-muted text-primary"
              />
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

function DropdownItem({ item, lang }: { item: MenuItem; lang: 'en' | 'hi' }) {
  const [open, setOpen] = useState(false);
  const label = pickText(item.label_en, item.label_hi, lang);

  return (
    <li
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        {label}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <ul
        className={cn(
          'absolute left-0 top-full z-40 min-w-56 rounded-md border border-border bg-surface p-1 shadow-lg',
          open ? 'block animate-fade-in' : 'hidden',
        )}
      >
        {/* The parent itself is reachable as the first item if it resolves a route. */}
        {menuHref(item) !== '#' && (
          <li>
            <MenuLink
              item={item}
              lang={lang}
              onNavigate={() => setOpen(false)}
              className="block rounded px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            />
          </li>
        )}
        {item.children.map((child) => (
          <li key={child.id}>
            <MenuLink
              item={child}
              lang={lang}
              onNavigate={() => setOpen(false)}
              className="block rounded px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              activeClassName="text-primary"
            />
          </li>
        ))}
      </ul>
    </li>
  );
}
