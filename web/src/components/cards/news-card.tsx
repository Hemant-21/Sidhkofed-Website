'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import type { NewsSummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDate, truncate } from '@/utils/format';
import { Card } from '@/components/ui/card';
import { CoverImage } from '@/components/content/cover-image';
import { HighlightBadge } from '@/components/ui/badge';

export function NewsCard({ news }: { news: NewsSummary }) {
  const { language } = useLanguage();
  const title = pickText(news.title_en, news.title_hi, language);
  const summary = pickText(news.summary_en, news.summary_hi, language);

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={news.public_url} className="block focus-visible:outline-none">
        <CoverImage media={news.cover_media} fallbackAlt={title} className="aspect-[16/9] w-full" rounded={false} />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <HighlightBadge type={news.highlight_type} />
          {news.news_published_at && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(news.news_published_at, language)}
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold leading-snug text-foreground">
          <Link href={news.public_url} className="hover:text-primary hover:underline">
            {title}
          </Link>
        </h3>
        {summary && <p className="mt-1.5 text-sm text-muted-foreground">{truncate(summary, 130)}</p>}
      </div>
    </Card>
  );
}
