'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import type { CommunicationSummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';

export function AnnouncementTicker({ items }: { items: CommunicationSummary[] }) {
  const { language } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="border-b border-border bg-primary/[0.04] dark:bg-primary/10">
        <div className="mx-auto flex max-w-screen-xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Badge />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Official notices and circulars issued by SIDHKOFED will appear here once published.
          </p>
          <ViewAll />
        </div>
      </div>
    );
  }

  const entries = items.map((item) => ({
    title: pickText(item.title_en, item.title_hi, language),
    href: item.public_url,
  }));

  // Duration scales with item count so each title stays on screen long enough to read
  const duration = Math.max(18, items.length * 9);

  return (
    <div className="border-b border-border bg-primary/[0.04] dark:bg-primary/10">
      <div className="mx-auto flex max-w-screen-xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <Badge />

        {/* Overflow clip — the scrolling track lives inside here */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {/*
           * Items are rendered TWICE. The animation runs from translateX(0) to translateX(-50%).
           * When the first copy scrolls fully off the left edge (-50%), the second copy has
           * seamlessly taken its place and the animation resets to 0 — continuous loop, no jump.
           */}
          <div
            className="ticker-track flex w-max items-center whitespace-nowrap"
            style={{ animationDuration: `${duration}s` }}
          >
            {[...entries, ...entries].map((entry, i) => (
              <span key={i} className="inline-flex items-center">
                <Link
                  href={entry.href}
                  className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                >
                  {entry.title}
                </Link>
                <span className="mx-6 select-none text-border/60" aria-hidden="true">◆</span>
              </span>
            ))}
          </div>
        </div>

        <ViewAll />
      </div>
    </div>
  );
}

function Badge() {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-white">
      <Bell className="h-3 w-3" aria-hidden="true" />
      Alert
    </span>
  );
}

function ViewAll() {
  return (
    <Link
      href="/notifications/notices"
      className="shrink-0 whitespace-nowrap text-xs font-semibold text-primary hover:underline"
    >
      View all →
    </Link>
  );
}
