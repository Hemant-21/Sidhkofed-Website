'use client';

import { useEffect, useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MenuItem } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { MenuLink } from './menu-link';
import { LanguageToggle, TextSizeControls } from './accessibility-controls';

/**
 * Mobile navigation: a toggle button (`aria-expanded`/`aria-controls`) opening a
 * full-height drawer with the header menu (nested as a disclosure), plus language
 * and text-size controls. Closes on route change and on Escape.
 */
export function MobileNav({ items }: { items: MenuItem[] }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    if (open) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.menu')}
            className="absolute right-0 top-0 flex h-full w-[85%] max-w-sm animate-slide-in-right flex-col bg-surface shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <span className="font-semibold">{t('nav.menu')}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('nav.closeMenu')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-2">
              <ul className="flex flex-col">
                {items.map((item) => (
                  <MobileNavItem key={item.id} item={item} lang={language} onNavigate={() => setOpen(false)} />
                ))}
              </ul>
            </nav>

            <div className="space-y-3 border-t border-border bg-muted/40 p-4">
              <LanguageToggle className="text-foreground" />
              <TextSizeControls className="text-foreground" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileNavItem({
  item,
  lang,
  onNavigate,
}: {
  item: MenuItem;
  lang: 'en' | 'hi';
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (item.children.length === 0) {
    return (
      <li>
        <MenuLink
          item={item}
          lang={lang}
          onNavigate={onNavigate}
          className="block rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
          activeClassName="text-primary"
        />
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
      >
        {pickText(item.label_en, item.label_hi, lang)}
        <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <ul className="ml-3 border-l border-border pl-2">
          {item.children.map((child) => (
            <li key={child.id}>
              <MenuLink
                item={child}
                lang={lang}
                onNavigate={onNavigate}
                className="block rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                activeClassName="text-primary"
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
