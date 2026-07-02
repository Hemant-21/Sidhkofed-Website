'use client';

import Link from 'next/link';
import type { EventSummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';

function shortMonth(dateStr: string, lang: string): string {
  try {
    return new Date(dateStr).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short' });
  } catch {
    return '—';
  }
}

export function TrainingTimeline({ events }: { events: EventSummary[] }) {
  const { language } = useLanguage();

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No upcoming training programmes at this time.</p>
    );
  }

  return (
    <div className="space-y-5">
      {events.map((event) => {
        const district =
          event.location_text ||
          pickText(event.district?.name_en ?? null, event.district?.name_hi ?? null, language);

        return (
          <article key={event.id} className="flex gap-4">
            <div className="flex w-14 shrink-0 flex-col items-center pt-0.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-xs font-bold uppercase text-primary">
                {shortMonth(event.start_date, language)}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-snug text-foreground">
                <Link href={event.public_url} className="hover:text-primary hover:underline">
                  {pickText(event.title_en, event.title_hi, language)}
                </Link>
              </h3>
              {district && (
                <p className="mt-0.5 text-xs text-muted-foreground">{district}</p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
