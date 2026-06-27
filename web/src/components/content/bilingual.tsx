'use client';

/**
 * Client-side bilingual content primitives. Detail pages are fetched server-side
 * (SSR/SEO) but render their editorial body through these so the language toggle
 * switches content without a refetch. Manual Hindi wins; English is the fallback
 * (codex §10). The backend never machine-translates in Phase 1, so we only surface
 * the automatic-translation label if the API ever reports one.
 */

import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { RichText } from '@/components/content/rich-text';

/** Bilingual plain-text heading (the page <h1>). */
export function BilingualTitle({
  en,
  hi,
  className = 'text-2xl font-bold tracking-tight text-foreground sm:text-3xl',
}: {
  en: string;
  hi: string | null;
  className?: string;
}) {
  const { language } = useLanguage();
  return <h1 className={className}>{pickText(en, hi, language)}</h1>;
}

/** Bilingual lead/summary paragraph. */
export function BilingualLead({ en, hi }: { en: string | null; hi: string | null }) {
  const { language } = useLanguage();
  const text = pickText(en, hi, language);
  if (!text) return null;
  return <p className="mt-3 text-lg text-muted-foreground">{text}</p>;
}

/** Bilingual rich-text body (sanitized HTML). */
export function BilingualBody({ en, hi }: { en: string | null | undefined; hi: string | null | undefined }) {
  const { language } = useLanguage();
  const html = language === 'hi' ? hi || en : en || hi;
  return <RichText html={html} lang={language} className="mt-6" />;
}

/** Inline auto-translation notice (codex §10) — only shows for labelled automatic Hindi. */
export function TranslationNotice({ source }: { source: string | null | undefined }) {
  const { language, t } = useLanguage();
  if (!(language === 'hi' && source === 'automatic')) return null;
  return (
    <p className="mt-2 inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {t('translation.automatic')} · स्वचालित अनुवाद
    </p>
  );
}
