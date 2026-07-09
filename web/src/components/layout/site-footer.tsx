'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Mail, Phone, Clock } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { Container } from '@/components/ui/container';
import { FOOTER_NAV } from '@/config/navigation';
import type { PublicContactSettings } from '@/lib/types/settings';

export function SiteFooter({ contactSettings }: { contactSettings: PublicContactSettings | null }) {
  const { t, language } = useLanguage();
  const year = new Date().getFullYear();

  // Live values from Settings → Contact (getContactSettings(), fetched once in layout.tsx).
  // Each row hides individually when blank — no CMS-editable field pretends to have a value.
  // Note: unlike the previous hardcoded pair, Settings stores one string per key (no _en/_hi
  // split), so this shows in whatever single language the admin typed — not bilingual.
  const address = contactSettings?.['contact.address'].trim() ?? '';
  const phone = contactSettings?.['contact.phone'].trim() ?? '';
  const email = contactSettings?.['contact.email'].trim() ?? '';
  const hours = contactSettings?.['contact.office_hours'].trim() ?? '';

  return (
    <footer className="mt-16 border-t border-border bg-foreground text-background">
      <Container className="py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">

          {/* Col 1 — Identity + contact */}
          <div>
            <div className="flex items-center gap-3">
              <Image src="/logo-sidhkofed.png" alt="SIDHKOFED" width={40} height={40} className="shrink-0" />
              <span className="text-lg font-bold" lang={language}>
                {t('site.name')}
              </span>
            </div>
            <p className="mt-3 text-sm text-background/70" lang={language}>
              {t('site.tagline')}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-background/70">
              {address !== '' ? (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="sr-only">{t('contact.address')}: </span>
                    {address}
                  </span>
                </li>
              ) : null}
              {phone !== '' ? (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="hover:text-background">
                    <span className="sr-only">{t('contact.phone')}: </span>
                    {phone}
                  </a>
                </li>
              ) : null}
              {email !== '' ? (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <a href={`mailto:${email}`} className="hover:text-background">
                    <span className="sr-only">{t('contact.email')}: </span>
                    {email}
                  </a>
                </li>
              ) : null}
              {hours !== '' ? (
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="sr-only">{t('contact.hours')}: </span>
                    {hours}
                  </span>
                </li>
              ) : null}
            </ul>
          </div>

          {/* Col 2 — About */}
          <FooterLinkColumn
            headingEn="About Us"
            headingHi="हमारे बारे में"
            items={FOOTER_NAV.about}
            language={language}
          />

          {/* Col 3 — Resources */}
          <FooterLinkColumn
            headingEn="Resources"
            headingHi="संसाधन"
            items={FOOTER_NAV.resources}
            language={language}
          />

          {/* Col 4 — Important Links */}
          <FooterLinkColumn
            headingEn="Important Links"
            headingHi="महत्वपूर्ण लिंक"
            items={FOOTER_NAV.important}
            language={language}
          />
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-background/20 pt-6 text-sm text-background/70 sm:flex-row sm:items-center">
          <p>© {year} {t('footer.copyright')}</p>
          <p className="text-xs text-background/50">{t('footer.prototypeNotice')}</p>
          <Link href="/search" className="hover:text-background hover:underline">
            {t('nav.search')}
          </Link>
        </div>
      </Container>
    </footer>
  );
}

function FooterLinkColumn({
  headingEn,
  headingHi,
  items,
  language,
}: {
  headingEn: string;
  headingHi: string;
  items: { key: string; labelEn: string; labelHi: string; href: string; external?: boolean }[];
  language: 'en' | 'hi';
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-background">
        {pickText(headingEn, headingHi, language)}
      </h2>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.key}>
            {item.external ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-background/70 hover:text-background hover:underline"
              >
                {pickText(item.labelEn, item.labelHi, language)}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <Link
                href={item.href}
                className="text-background/70 hover:text-background hover:underline"
              >
                {pickText(item.labelEn, item.labelHi, language)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
