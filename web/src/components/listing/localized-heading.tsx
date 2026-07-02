'use client';

/**
 * Client heading/paragraph that resolve i18n keys so listing chrome is bilingual.
 * The server pre-renders these in the default language (good for SEO crawlers);
 * the language toggle re-renders them client-side without a network round-trip.
 */

import { SectionHeading } from '@/components/ui/section-heading';
import { useLanguage } from '@/providers/language-provider';

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
