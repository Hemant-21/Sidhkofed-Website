'use client';

/** Localized "N results" line for listings, announced politely to screen readers. */

import { useLanguage } from '@/providers/language-provider';
import { formatNumber } from '@/utils/format';

export function ResultsSummary({ total }: { total: number }) {
  const { t, language } = useLanguage();
  return (
    <p className="mb-4 mt-4 text-sm text-muted-foreground" aria-live="polite">
      {formatNumber(total, language)} {t('common.results')}
    </p>
  );
}
