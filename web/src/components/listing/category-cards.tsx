'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';

export interface CategoryCardDef {
  /** Pre-rendered icon element, e.g. `<GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />`.
   *  Must be a rendered element (not a component reference) — this crosses the Server→Client
   *  Component boundary, and only serializable ReactNode, not functions, can cross it. */
  icon: ReactNode;
  /** i18n key for the card title. */
  titleKey: string;
  /** i18n key for the card description. */
  descriptionKey: string;
  /** Same-page deep link, e.g. `/activities?event_type=training#listing`. */
  href: string;
}

/**
 * "Browse by Category" card grid. Cards are plain same-page links carrying a query param
 * that the listing below already reads (`FilterBar` + `useQueryParams`) — clicking a card is
 * indistinguishable from picking the same value in the filter dropdown, so no separate sync
 * logic is needed; the URL query string is the single source of truth for both.
 *
 * This is the same pattern `/publications` built inline for its own category cards, extracted
 * here (bilingual via i18n keys) so any listing page can reuse the identical markup/interaction
 * instead of a parallel one-off.
 */
export function CategoryCards({ categories }: { categories: CategoryCardDef[] }) {
  const { t } = useLanguage();
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map(({ icon, titleKey, descriptionKey, href }) => (
        <Link
          key={href}
          href={href}
          className="group flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-tight text-foreground">{t(titleKey)}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(descriptionKey)}</p>
          </div>
          <ArrowRight
            className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden="true"
          />
        </Link>
      ))}
    </div>
  );
}
