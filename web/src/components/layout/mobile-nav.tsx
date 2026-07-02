'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { NavItem } from '@/config/navigation';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';

export function MobileNav({ items }: { items: NavItem[] }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Portal target only available after hydration
  useEffect(() => { setMounted(true); }, []);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll + ESC key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    if (open) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey);
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      {/* Toggle — stays in header (z-[60]), always clickable */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-overlay"
        aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
      >
        {open
          ? <X    className="h-6 w-6" aria-hidden="true" />
          : <Menu className="h-6 w-6" aria-hidden="true" />}
      </button>

      {/*
       * Portal to document.body — bypasses the header's backdrop-blur,
       * which would otherwise make `position:fixed` children use the
       * header as their containing block instead of the viewport.
       * z-50 < header z-[60], so the header floats above the overlay
       * and the hamburger remains tappable.
       */}
      {open && mounted && createPortal(
        <div
          id="mobile-nav-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.menu')}
          className="fixed inset-0 z-50 flex flex-col bg-surface"
        >
          {/* Silent spacers mirror header height: utility bar (h-10) + main bar (h-16) */}
          <div className="h-10 shrink-0" aria-hidden="true" />
          <div className="h-16 shrink-0" aria-hidden="true" />

          {/* Nav items — scrollable */}
          <nav aria-label="Mobile navigation" className="min-h-0 flex-1 overflow-y-auto">
            <ul className="divide-y divide-border/50 px-5">
              {items.map((item) => (
                <MobileNavItem
                  key={item.key}
                  item={item}
                  lang={language}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </ul>
          </nav>

          {/* Contact Us — pinned to bottom */}
          <div className="shrink-0 border-t border-border px-6 py-5">
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t('nav.contactUs')}
            </Link>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function MobileNavItem({
  item,
  lang,
  onNavigate,
}: {
  item: NavItem;
  lang: 'en' | 'hi';
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  const label = pickText(item.labelEn, item.labelHi, lang);
  const isActive =
    pathname === item.href ||
    (item.href !== '/' && pathname.startsWith(`${item.href}/`));

  if (!item.children || item.children.length === 0) {
    return (
      <li>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'block py-4 text-base font-medium text-foreground transition-colors hover:text-primary',
            isActive && 'text-primary',
          )}
        >
          {label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-base font-medium text-foreground"
      >
        <span className={cn(isActive && 'text-primary')}>{label}</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform duration-200',
            expanded && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <ul className="mb-3 space-y-0.5 pl-3">
          {item.children!.map((child) => {
            const childActive = pathname === child.href;
            return (
              <li key={child.key}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={childActive ? 'page' : undefined}
                  className={cn(
                    'block rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    childActive && 'text-primary',
                  )}
                >
                  {pickText(child.labelEn, child.labelHi, lang)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
