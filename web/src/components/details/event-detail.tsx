'use client';

/**
 * Event detail view (bilingual, client island). Renders common event fields,
 * validated dynamic fields, post-completion outcomes, and links to programmes,
 * commodities, institutions, documents, galleries and any derived news — all
 * backend-driven (codex §4.1). Galleries are shown as thumbnails inline; the
 * public API exposes no standalone gallery route, so they are not linked out.
 */

import Link from 'next/link';
import { CalendarDays, MapPin, Newspaper } from 'lucide-react';
import type { EventDetail } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDateRange, formatNumber, humanizeEnum } from '@/utils/format';
import { CoverImage } from '@/components/content/cover-image';
import { StatusBadge, HighlightBadge, Badge } from '@/components/ui/badge';
import { BilingualTitle, BilingualLead, BilingualBody, TranslationNotice } from '@/components/content/bilingual';
import { DetailSection } from '@/components/content/detail-layout';
import { MetaList } from '@/components/content/meta-list';
import { Chips } from '@/components/content/chips';
import { DocumentLinks } from '@/components/content/document-links';

/** Render primitive dynamic field values; skip nested objects/null. */
function dynamicRows(values: Record<string, unknown>): Array<{ label: string; value: string }> {
  return Object.entries(values)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => ({
      label: humanizeEnum(k),
      value: typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v),
    }));
}

export function EventArticle({ event }: { event: EventDetail }) {
  const { t, language } = useLanguage();
  const location = event.location_text || pickText(event.district?.name_en, event.district?.name_hi ?? null, language);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="primary">{pickText(event.event_type.name_en, event.event_type.name_hi, language)}</Badge>
        <StatusBadge status={event.event_status} />
        <HighlightBadge type={event.highlight_type} />
      </div>

      <BilingualTitle en={event.title_en} hi={event.title_hi} />
      <TranslationNotice source={event.translation_source} />

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {formatDateRange(event.start_date, event.end_date, language)}
        </span>
        {location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {location}
          </span>
        )}
      </div>

      {event.cover_media && (
        <CoverImage
          media={event.cover_media}
          fallbackAlt={pickText(event.title_en, event.title_hi, language)}
          className="mt-6 aspect-[16/9] w-full"
          sizes="(max-width: 1024px) 100vw, 720px"
          priority
        />
      )}

      <BilingualLead en={event.summary_en} hi={event.summary_hi} />
      <BilingualBody en={event.description_en} hi={event.description_hi} />

      {dynamicRows(event.dynamic_values).length > 0 && (
        <div className="mt-8">
          <DetailSection title={t('detail.overview')}>
            <MetaList items={dynamicRows(event.dynamic_values)} />
          </DetailSection>
        </div>
      )}

      {(event.outcome_summary_en || event.key_highlights || event.final_participant_count !== null) && (
        <div className="mt-8 space-y-4 rounded-lg border border-border bg-muted/30 p-5">
          <h2 className="text-lg font-semibold text-foreground">{t('detail.outcomes')}</h2>
          <BilingualBody en={event.outcome_summary_en} hi={event.outcome_summary_hi} />
          {event.key_highlights && <p className="text-sm text-foreground">{event.key_highlights}</p>}
          {event.final_participant_count !== null && (
            <p className="text-sm text-muted-foreground">
              {t('detail.participants')}: <strong>{formatNumber(event.final_participant_count, language)}</strong>
            </p>
          )}
        </div>
      )}

      {event.galleries.length > 0 && (
        <div className="mt-8">
          <DetailSection title={t('detail.galleries')}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {event.galleries.map((g) => (
                <li key={g.id} className="overflow-hidden rounded-md border border-border">
                  <CoverImage media={g.cover_media} fallbackAlt={g.title_en} className="aspect-[4/3] w-full" rounded={false} />
                  <p className="truncate px-2 py-1 text-xs text-muted-foreground">
                    {g.title_en} · {g.image_count}
                  </p>
                </li>
              ))}
            </ul>
          </DetailSection>
        </div>
      )}
    </>
  );
}

export function EventAside({ event }: { event: EventDetail }) {
  const { t, language } = useLanguage();

  const commodities = event.commodities.map((c) => ({
    label: pickText(c.name_en, c.name_hi, language),
  }));
  const programmes = event.programmes.map((p) => ({
    href: `/programmes/${p.slug}`,
    label: pickText(p.title_en, p.title_hi, language),
  }));
  const institutions = event.institutions.map((i) => ({
    href: `/institutions/${i.slug}`,
    label: pickText(i.name_en, i.name_hi, language),
  }));

  return (
    <>
      {event.news.length > 0 && (
        <DetailSection title={t('detail.viewNews')}>
          <ul className="space-y-2">
            {event.news.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.public_url}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Newspaper className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {n.title_en}
                </Link>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {programmes.length > 0 && (
        <DetailSection title={t('detail.relatedProgrammes')}>
          <Chips items={programmes} />
        </DetailSection>
      )}
      {commodities.length > 0 && (
        <DetailSection title={t('detail.commodities')}>
          <Chips items={commodities} />
        </DetailSection>
      )}
      {institutions.length > 0 && (
        <DetailSection title={t('detail.institutions')}>
          <Chips items={institutions} />
        </DetailSection>
      )}
      {event.documents.length > 0 && (
        <DetailSection title={t('detail.documents')}>
          <DocumentLinks documents={event.documents} />
        </DetailSection>
      )}
    </>
  );
}
