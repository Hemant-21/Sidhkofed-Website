'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import type { MenuItem } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { Container } from '@/components/ui/container';
import { DesktopNav } from './desktop-nav';
import { MobileNav } from './mobile-nav';
import { MenuLink } from './menu-link';
import { LanguageToggle, TextSizeControls } from './accessibility-controls';

/**
 * Sticky site header. Backend-driven: header + utility menus come from
 * `/public/menus`. Utility bar carries language/text-size + utility links;
 * main bar carries the identity, primary nav, and search.
 */
export function SiteHeader({
  headerMenu,
  utilityMenu,
}: {
  headerMenu: MenuItem[];
  utilityMenu: MenuItem[];
}) {
  const { t, language } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 shadow-sm backdrop-blur">
      {/* Utility bar */}
      <div className="border-b border-border bg-primary text-primary-foreground">
        <Container className="flex h-10 items-center justify-between">
          <ul className="hidden items-center gap-4 text-xs sm:flex">
            {utilityMenu.map((item) => (
              <li key={item.id}>
                <MenuLink item={item} lang={language} className="hover:underline" activeClassName="underline" />
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <TextSizeControls className="hidden sm:flex" />
            <LanguageToggle />
          </div>
        </Container>
      </div>

      {/* Main bar */}
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label={t('site.name')}>
          <span
            className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-base font-extrabold text-primary-foreground"
            aria-hidden="true"
          >
            SK
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold text-foreground" lang={language}>
              {t('site.name')}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block" lang={language}>
              {t('site.fullName')}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <DesktopNav items={headerMenu} />
          <Link
            href="/search"
            aria-label={t('nav.search')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>
          <MobileNav items={headerMenu} />
        </div>
      </Container>
    </header>
  );
}

/** Header menu item resolver re-export for convenience. */
export function headerLabel(item: MenuItem, lang: 'en' | 'hi'): string {
  return pickText(item.label_en, item.label_hi, lang);
}
