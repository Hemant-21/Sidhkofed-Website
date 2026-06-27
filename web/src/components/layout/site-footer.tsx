'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Mail, Phone } from 'lucide-react';
import type { MenuItem } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { Container } from '@/components/ui/container';
import { MenuLink } from './menu-link';

/**
 * Site footer. Structure is fixed in code (codex §18: "Footer structure remains
 * fixed in code"); the link columns are hydrated from the backend footer menu.
 * Office details are representative until official Settings data is approved
 * (master-build-context §3) — clearly labelled as such.
 */
export function SiteFooter({ footerMenu }: { footerMenu: MenuItem[] }) {
  const { t, language } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-foreground text-background">
      <Container className="py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo-sidhkofed.png"
                alt="SIDHKOFED"
                width={40}
                height={40}
                className="shrink-0"
              />
              <span className="text-lg font-bold" lang={language}>
                {t('site.name')}
              </span>
            </div>
            <p className="mt-3 text-sm text-background/70" lang={language}>
              {t('site.tagline')}
            </p>
            {/* Representative office details — pending official data. */}
            <ul className="mt-4 space-y-2 text-sm text-background/70">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Ranchi, Jharkhand <em className="not-italic text-background/50">(representative)</em></span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="text-background/50">Pending official data</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="text-background/50">Pending official data</span>
              </li>
            </ul>
          </div>

          {/* Backend-driven footer menu columns (top-level groups → children). */}
          {footerMenu.slice(0, 3).map((group) => (
            <div key={group.id}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-background">
                <MenuLink item={group} lang={language} className="hover:underline" />
              </h2>
              {group.children.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm">
                  {group.children.map((child) => (
                    <li key={child.id}>
                      <MenuLink
                        item={child}
                        lang={language}
                        className="text-background/70 hover:text-background hover:underline"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-background/20 pt-6 text-sm text-background/70 sm:flex-row sm:items-center">
          <p>
            © {year} {t('footer.copyright')}
          </p>
          <p className="text-xs text-background/50">{t('footer.prototypeNotice')}</p>
          <Link href="/search" className="hover:text-background hover:underline">
            {t('nav.search')}
          </Link>
        </div>
      </Container>
    </footer>
  );
}
