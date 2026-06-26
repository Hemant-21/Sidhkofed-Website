'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import type { MenuItem } from '@/lib/types/content';
import type { Language } from '@/i18n/dictionary';
import { pickText } from '@/utils/bilingual';

/** Resolve a backend menu item to its destination href. */
export function menuHref(item: Pick<MenuItem, 'url' | 'page'>): string {
  if (item.page?.slug) return `/${item.page.slug}`;
  return item.url ?? '#';
}

/** True when the href targets an external origin (opens in a new tab). */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * A single menu link with active-state. Internal links use next/link with
 * `aria-current`; external links open safely in a new tab.
 */
export function MenuLink({
  item,
  lang,
  className,
  activeClassName = 'text-primary',
  onNavigate,
}: {
  item: MenuItem;
  lang: Language;
  className?: string;
  activeClassName?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const href = menuHref(item);
  const label = pickText(item.label_en, item.label_hi, lang);
  const external = isExternalHref(href) || item.opens_new_tab;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {label}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  const isActive = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(className, isActive && activeClassName)}
    >
      {label}
    </Link>
  );
}
