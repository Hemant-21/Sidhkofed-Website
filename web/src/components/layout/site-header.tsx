'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { Container } from '@/components/ui/container';
import { PRIMARY_NAV } from '@/config/navigation';
import { DesktopNav } from './desktop-nav';
import { MobileNav } from './mobile-nav';
import { LanguageToggle, TextSizeControls } from './accessibility-controls';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  const { t, language } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 shadow-sm backdrop-blur">
      {/* Utility bar */}
      <div className="border-b border-border bg-primary text-primary-foreground">
        <Container className="flex h-10 items-center justify-between">
          <span className="hidden text-xs text-primary-foreground/80 sm:block">
            {pickText('Official portal of SIDHKOFED, Govt. of Jharkhand', 'SIDHKOFED, झारखंड सरकार का आधिकारिक पोर्टल', language)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <TextSizeControls className="hidden text-primary-foreground sm:flex" />
            <LanguageToggle />
            <ThemeToggle className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
          </div>
        </Container>
      </div>

      {/* Main bar */}
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label={t('site.name')}>
          <Image
            src="/logo-sidhkofed.png"
            alt="SIDHKOFED"
            width={40}
            height={40}
            className="shrink-0"
            priority
          />
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
          <DesktopNav items={PRIMARY_NAV} />
          <Link
            href="/search"
            aria-label={t('nav.search')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>
          {/* Contact Us CTA — desktop only, per nav context §1 */}
          <Link
            href="/contact"
            className="ml-2 hidden rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 lg:inline-flex"
          >
            {t('nav.contactUs')}
          </Link>
          <MobileNav items={PRIMARY_NAV} />
          <Image
            src="/logo-jharkhand.png"
            alt="Government of Jharkhand"
            width={40}
            height={40}
            className="ml-2 hidden shrink-0 sm:block"
          />
        </div>
      </Container>
    </header>
  );
}
