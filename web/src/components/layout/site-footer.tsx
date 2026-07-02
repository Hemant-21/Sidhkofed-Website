'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Mail, Phone, Clock } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { Container } from '@/components/ui/container';
import { FOOTER_NAV } from '@/config/navigation';

export function SiteFooter() {
  const { t, language } = useLanguage();
  const year = new Date().getFullYear();

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
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {pickText(
                    'Sameti Bhawan, Kanke Road, Ranchi, Jharkhand – 834008',
                    'समेति भवन, कांके रोड, राँची, झारखंड – 834008',
                    language,
                  )}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                <a href="tel:06512913012" className="hover:text-background">0651-2913012</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <a href="mailto:sidhokanhofed@gmail.com" className="hover:text-background">
                  sidhokanhofed@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{pickText('Mon – Fri, 10 AM – 6 PM', 'सोम – शुक्र, 10 बजे – 6 बजे', language)}</span>
              </li>
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
