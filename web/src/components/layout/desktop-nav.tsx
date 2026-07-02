'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { NavItem } from '@/config/navigation';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';

export function DesktopNav({ items }: { items: NavItem[] }) {
  const { language } = useLanguage();
  return (
    <nav aria-label="Primary" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {items.map((item) =>
          item.children && item.children.length > 0 ? (
            <DropdownItem key={item.key} item={item} lang={language} />
          ) : (
            <li key={item.key}>
              <NavLink item={item} lang={language} className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted" activeClassName="bg-muted text-primary" />
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

function DropdownItem({ item, lang }: { item: NavItem; lang: 'en' | 'hi' }) {
  const [open, setOpen] = useState(false);
  const label = pickText(item.labelEn, item.labelHi, lang);

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
        {item.children!.map((child) => (
          <li key={child.key}>
            <NavLink
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

function NavLink({
  item,
  lang,
  className,
  activeClassName = 'text-primary',
  onNavigate,
}: {
  item: NavItem;
  lang: 'en' | 'hi';
  className?: string;
  activeClassName?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const label = pickText(item.labelEn, item.labelHi, lang);
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onNavigate}>
        {label}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(className, isActive && activeClassName)}
    >
      {label}
    </Link>
  );
}
