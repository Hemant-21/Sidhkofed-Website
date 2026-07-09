'use client';

/**
 * Client heading/paragraph that resolve i18n keys so listing chrome is bilingual.
 * The server pre-renders these in the default language (good for SEO crawlers);
 * the language toggle re-renders them client-side without a network round-trip.
 */

import { SectionHeading } from '@/components/ui/section-heading';
import { Container } from '@/components/ui/container';
import { useLanguage } from '@/providers/language-provider';

/**
 * Bilingual page-header "hero" band — a colored `bg-primary` strip with a large white title
 * + subtitle. Mirrors the `/publications` page header exactly (same markup/classes), just
 * resolving text from i18n keys instead of hardcoded English so pages with existing bilingual
 * copy (like `/activities`) don't lose Hindi support to match the visual style.
 */
export function LocalizedHero({ titleKey, subtitleKey }: { titleKey: string; subtitleKey?: string }) {
  const { t } = useLanguage();
  return (
    <div className="bg-primary">
      <Container className="py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t(titleKey)}</h1>
        {subtitleKey ? <p className="mt-2 max-w-2xl text-base text-white/70">{t(subtitleKey)}</p> : null}
      </Container>
    </div>
  );
}

export function LocalizedHeading({
  titleKey,
  as = 'h1',
}: {
  titleKey: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  const { t } = useLanguage();
  return <SectionHeading title={t(titleKey)} as={as} />;
}

export function LocalizedText({ textKey, className }: { textKey: string; className?: string }) {
  const { t } = useLanguage();
  const value = t(textKey);
  if (!value || value === textKey) return null;
  return <p className={className}>{value}</p>;
}
