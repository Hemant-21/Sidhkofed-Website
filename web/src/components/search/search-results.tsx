'use client';

/** Renders backend search results (codex §14). Each row links to its public detail
 *  via the API-provided `public_url`; the website does no client-side indexing. */

import Link from 'next/link';
import type { SearchResult } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDate, humanizeEnum, truncate } from '@/utils/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CoverImage } from '@/components/content/cover-image';

/** Localized status line for the search page (no query yet / no results). */
export function SearchMessage({ kind }: { kind: 'prompt' | 'none' }) {
  const { t } = useLanguage();
  const message = kind === 'none' ? t('search.noResults') : t('search.placeholder');
  return (
    <p className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-muted-foreground">
      {message}
    </p>
  );
}

export function SearchResults({ results }: { results: SearchResult[] }) {
  const { language } = useLanguage();

  return (
    <ul className="space-y-4">
      {results.map((result) => {
        const title = pickText(result.title_en, result.title_hi, language);
        return (
          <li key={`${result.content_type}-${result.id}`}>
            <Card className="flex gap-4 p-4">
              {result.cover_media && (
                <Link href={result.public_url} className="shrink-0">
                  <CoverImage media={result.cover_media} fallbackAlt={title} className="h-20 w-28" />
                </Link>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{humanizeEnum(result.content_type)}</Badge>
                  {result.publication_date && (
                    <span className="text-xs text-muted-foreground">{formatDate(result.publication_date, language)}</span>
                  )}
                </div>
                <h2 className="text-base font-semibold leading-snug text-foreground">
                  <Link href={result.public_url} className="hover:text-primary hover:underline">
                    {title}
                  </Link>
                </h2>
                {result.summary && <p className="mt-1 text-sm text-muted-foreground">{truncate(result.summary, 180)}</p>}
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
