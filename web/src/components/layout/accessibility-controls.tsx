'use client';

import { AArrowDown, AArrowUp, RotateCcw, Languages } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { LANGUAGE_LABELS, type Language } from '@/i18n/dictionary';
import { cn } from '@/utils/cn';

/** Text-size increase/decrease/reset (codex §6 accessibility controls). */
export function TextSizeControls({ className }: { className?: string }) {
  const { t, increaseFont, decreaseFont, resetFont } = useLanguage();
  const btn =
    'inline-flex h-7 w-7 items-center justify-center rounded hover:bg-surface/20 focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <div className={cn('flex items-center gap-1', className)} role="group" aria-label={t('a11y.textSize')}>
      <button type="button" className={btn} onClick={decreaseFont} aria-label={t('a11y.decrease')}>
        <AArrowDown className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" className={btn} onClick={resetFont} aria-label={t('a11y.reset')}>
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button type="button" className={btn} onClick={increaseFont} aria-label={t('a11y.increase')}>
        <AArrowUp className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** English/Hindi UI language toggle. */
export function LanguageToggle({ className }: { className?: string }) {
  const { t, language, setLanguage } = useLanguage();
  return (
    <div className={cn('flex items-center gap-1', className)} role="group" aria-label={t('a11y.language')}>
      <Languages className="mr-1 h-4 w-4" aria-hidden="true" />
      {(['en', 'hi'] as Language[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          aria-pressed={language === lang}
          lang={lang}
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring',
            language === lang ? 'bg-surface text-primary' : 'hover:bg-surface/20',
          )}
        >
          {LANGUAGE_LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
