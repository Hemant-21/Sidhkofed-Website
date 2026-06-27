'use client';

/** News detail view (bilingual). News is derived from a completed event but keeps
 *  its own editorial fields; it links back to the source event (codex §4.1). */

import Link from 'next/link';
import { CalendarDays, CalendarRange } from 'lucide-react';
import type { NewsDetail } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDate } from '@/utils/format';
import { CoverImage } from '@/components/content/cover-image';
import { HighlightBadge } from '@/components/ui/badge';
import { BilingualTitle, BilingualLead, BilingualBody } from '@/components/content/bilingual';

export function NewsArticle({ news }: { news: NewsDetail }) {
  const { t, language } = useLanguage();

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <HighlightBadge type={news.highlight_type} />
        {news.news_published_at && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {t('common.publishedOn')} {formatDate(news.news_published_at, language)}
          </span>
        )}
      </div>

      <BilingualTitle en={news.title_en} hi={news.title_hi} />

      {news.cover_media && (
        <CoverImage
          media={news.cover_media}
          fallbackAlt={pickText(news.title_en, news.title_hi, language)}
          className="mt-6 aspect-[16/9] w-full"
          sizes="(max-width: 1024px) 100vw, 720px"
          priority
        />
      )}

      <BilingualLead en={news.summary_en} hi={news.summary_hi} />
      <BilingualBody en={news.body_en} hi={news.body_hi} />

      {news.source_event && (
        <p className="mt-8 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <CalendarRange className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('detail.sourceEvent')}:{' '}
          <Link href={news.source_event.public_url} className="font-medium text-primary hover:underline">
            {pickText(news.source_event.title_en, news.source_event.title_hi, language)}
          </Link>
        </p>
      )}
    </>
  );
}
