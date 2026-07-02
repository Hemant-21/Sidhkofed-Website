'use client';

import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import type { EventSummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDateRange, truncate } from '@/utils/format';
import { Card } from '@/components/ui/card';
import { CoverImage } from '@/components/content/cover-image';
import { HighlightBadge, StatusBadge } from '@/components/ui/badge';

export function EventCard({ event }: { event: EventSummary }) {
  const { language } = useLanguage();
  const title = pickText(event.title_en, event.title_hi, language);
  const summary = pickText(event.summary_en, null, language);

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={event.public_url} className="block focus-visible:outline-none">
        <CoverImage media={event.cover_media} fallbackAlt={title} className="aspect-[16/9] w-full" rounded={false} />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-primary">{pickText(event.event_type.name_en, event.event_type.name_hi, language)}</span>
          <StatusBadge status={event.event_status} />
          <HighlightBadge type={event.highlight_type} />
        </div>
        <h3 className="text-base font-semibold leading-snug text-foreground">
          <Link href={event.public_url} className="hover:text-primary hover:underline">
            {title}
          </Link>
        </h3>
        {summary && <p className="mt-1.5 text-sm text-muted-foreground">{truncate(summary, 120)}</p>}
        <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <dd>{formatDateRange(event.start_date, event.end_date, language)}</dd>
          </div>
          {(event.location_text || event.district) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <dd>
                {event.location_text || pickText(event.district?.name_en, event.district?.name_hi ?? null, language)}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </Card>
  );
}
