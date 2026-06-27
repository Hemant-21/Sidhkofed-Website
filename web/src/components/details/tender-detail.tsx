'use client';

/** Tender detail (bilingual). Stores structured metadata + a GeM link only; tender
 *  documents, corrigenda and bidding stay on GeM (codex §4.7). No bid submission. */

import { ExternalLink } from 'lucide-react';
import type { TenderDetail } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDate } from '@/utils/format';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { BilingualTitle, BilingualLead } from '@/components/content/bilingual';
import { DetailSection } from '@/components/content/detail-layout';
import { MetaList } from '@/components/content/meta-list';

export function TenderArticle({ tender }: { tender: TenderDetail }) {
  const { t, language } = useLanguage();
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="primary">{pickText(tender.tender_type.name_en, tender.tender_type.name_hi, language)}</Badge>
        <StatusBadge status={tender.tender_status} />
      </div>
      <BilingualTitle en={tender.title_en} hi={tender.title_hi} />
      <BilingualLead en={tender.summary_en} hi={tender.summary_hi} />

      {tender.gem_url && (
        <a
          href={tender.gem_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t('detail.viewOnGem')}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">({t('common.opensNewTab')})</span>
        </a>
      )}
    </>
  );
}

export function TenderAside({ tender }: { tender: TenderDetail }) {
  const { t, language } = useLanguage();
  return (
    <DetailSection title={t('detail.overview')}>
      <MetaList
        items={[
          { label: t('detail.referenceNo'), value: tender.tender_number },
          { label: t('detail.publishDate'), value: formatDate(tender.publish_date, language) },
          { label: t('detail.submissionDeadline'), value: formatDate(tender.submission_deadline, language) },
          { label: t('detail.openingDate'), value: formatDate(tender.opening_date, language) },
        ]}
      />
    </DetailSection>
  );
}
