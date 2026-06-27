'use client';

/** Programme/scheme detail view (bilingual). Renders the reusable ProgrammeScheme
 *  fields and links to related commodities and permitted training types (codex §4.2). */

import type { ProgrammeDetail } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDateRange } from '@/utils/format';
import { Badge } from '@/components/ui/badge';
import { CoverImage } from '@/components/content/cover-image';
import { BilingualTitle, BilingualLead, BilingualBody } from '@/components/content/bilingual';
import { DetailSection } from '@/components/content/detail-layout';
import { Chips } from '@/components/content/chips';

/** A titled bilingual rich-text block, rendered only when content exists. */
function Block({ title, en, hi }: { title: string; en: string | null; hi: string | null }) {
  const { language } = useLanguage();
  if (!pickText(en, hi, language)) return null;
  return (
    <div className="mt-8">
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
      <BilingualBody en={en} hi={hi} />
    </div>
  );
}

export function ProgrammeArticle({ programme }: { programme: ProgrammeDetail }) {
  const { t, language } = useLanguage();

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {programme.short_code && <Badge tone="primary">{programme.short_code}</Badge>}
      </div>
      <BilingualTitle en={programme.title_en} hi={programme.title_hi} />

      {(programme.start_date || programme.funding_source) && (
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          {programme.start_date && <span>{formatDateRange(programme.start_date, programme.end_date, language)}</span>}
          {programme.funding_source && (
            <span>
              {t('detail.fundingSource')}: {programme.funding_source}
            </span>
          )}
        </div>
      )}

      {programme.cover_media && (
        <CoverImage
          media={programme.cover_media}
          fallbackAlt={pickText(programme.title_en, programme.title_hi, language)}
          className="mt-6 aspect-[16/9] w-full"
          sizes="(max-width: 1024px) 100vw, 720px"
          priority
        />
      )}

      <BilingualLead en={programme.summary_en} hi={programme.summary_hi} />
      <BilingualBody en={programme.description_en} hi={programme.description_hi} />

      <Block title={t('detail.overview')} en={programme.objectives_en} hi={programme.objectives_hi} />
      <Block title="Eligibility" en={programme.eligibility_en} hi={programme.eligibility_hi} />
      <Block title="Benefits" en={programme.benefits_en} hi={programme.benefits_hi} />
      <Block title="How to apply" en={programme.application_process_en} hi={programme.application_process_hi} />
    </>
  );
}

export function ProgrammeAside({ programme }: { programme: ProgrammeDetail }) {
  const { t, language } = useLanguage();
  const commodities = programme.commodities.map((c) => ({ label: pickText(c.name_en, c.name_hi, language) }));
  const trainings = programme.permitted_training_types.map((c) => ({ label: pickText(c.name_en, c.name_hi, language) }));

  return (
    <>
      {commodities.length > 0 && (
        <DetailSection title={t('detail.commodities')}>
          <Chips items={commodities} />
        </DetailSection>
      )}
      {trainings.length > 0 && (
        <DetailSection title={t('detail.trainingTypes')}>
          <Chips items={trainings} />
        </DetailSection>
      )}
    </>
  );
}
