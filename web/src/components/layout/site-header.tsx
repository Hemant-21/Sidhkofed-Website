'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { Container } from '@/components/ui/container';
import { PRIMARY_NAV } from '@/config/navigation';
import { DesktopNav } from './desktop-nav';
import { MobileNav } from './mobile-nav';
import { LanguageToggle, TextSizeControls } from './accessibility-controls';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  const { t, language } = useLanguage();

  return (
    <header className="sticky top-0 z-[60] border-b border-border bg-surface/95 shadow-sm backdrop-blur">
      {/* Utility bar — full org name on the left, controls on the right */}
      <div className="border-b border-border bg-primary text-primary-foreground">
        <Container className="flex h-10 items-center justify-between gap-4">
          <span className="hidden min-w-0 truncate text-xs font-medium text-primary-foreground/85 sm:block" lang={language}>
            {t('site.fullName')}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <TextSizeControls className="hidden text-primary-foreground sm:flex" />
            <LanguageToggle />
            <ThemeToggle className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
          </div>
        </Container>
      </div>

      {/* Main bar */}
      <Container className="flex h-16 items-center justify-between gap-4">
        {/* Brand — logo + abbreviation, never wraps or shrinks */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={t('site.name')}>
          <Image
            src="/logo-sidhkofed.png"
            alt="SIDHKOFED"
            width={48}
            height={48}
            className="shrink-0"
            priority
          />
          <span className="text-base font-bold text-foreground" lang={language}>
            {t('site.name')}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <DesktopNav items={PRIMARY_NAV} />
          <Link
            href="/search"
            aria-label={t('nav.search')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>
          {/* Contact Us — enlarged, prominent */}
          <Link
            href="/contact"
            className="ml-3 hidden items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground shadow-sm transition-all hover:bg-accent/90 hover:shadow-md lg:inline-flex"
          >
            {t('nav.contactUs')}
          </Link>
          <MobileNav items={PRIMARY_NAV} />
        </div>
      </Container>
    </header>
  );
}
