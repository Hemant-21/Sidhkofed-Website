'use client';

/** Procurement update detail (bilingual). One operation for rates, announcements,
 *  schedules, centres and trade opportunities; display is informational only — no
 *  procurement transactions (codex §4.8). */

import Link from 'next/link';
import type { ProcurementDetail } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDate, formatDateRange, formatNumber } from '@/utils/format';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { BilingualTitle, BilingualLead, BilingualBody } from '@/components/content/bilingual';
import { DetailSection } from '@/components/content/detail-layout';
import { MetaList } from '@/components/content/meta-list';
import { DocumentLinks } from '@/components/content/document-links';

export function ProcurementArticle({ item }: { item: ProcurementDetail }) {
  const { language } = useLanguage();
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="primary">
          {pickText(item.procurement_update_type.name_en, item.procurement_update_type.name_hi, language)}
        </Badge>
        {item.commodity && (
          <Badge tone="neutral">{pickText(item.commodity.name_en, item.commodity.name_hi, language)}</Badge>
        )}
        <StatusBadge status={item.status} />
      </div>
      <BilingualTitle en={item.title_en} hi={item.title_hi} />
      <BilingualLead en={item.summary_en} hi={item.summary_hi} />
      <BilingualBody en={item.description_en} hi={item.description_hi} />
    </>
  );
}

export function ProcurementAside({ item }: { item: ProcurementDetail }) {
  const { t, language } = useLanguage();
  const location = item.location_text || pickText(item.district?.name_en, item.district?.name_hi ?? null, language);
  const period = formatDateRange(item.period_start, item.period_end, language);

  return (
    <>
      <DetailSection title={t('detail.overview')}>
        <MetaList
          items={[
            {
              label: t('detail.rate'),
              value:
                item.rate != null ? `₹ ${formatNumber(item.rate, language)}${item.unit ? ` / ${item.unit}` : ''}` : null,
            },
            { label: t('detail.effectiveDate'), value: formatDate(item.effective_date, language) },
            { label: t('detail.period'), value: period },
            { label: t('detail.location'), value: location },
            {
              label: t('detail.relatedProgrammes'),
              value: item.programme ? (
                <Link href={`/programmes/${item.programme.slug}`} className="text-primary hover:underline">
                  {pickText(item.programme.title_en, item.programme.title_hi, language)}
                </Link>
              ) : null,
            },
          ]}
        />
      </DetailSection>
      {item.document && (
        <DetailSection title={t('detail.documents')}>
          <DocumentLinks documents={[item.document]} />
        </DetailSection>
      )}
    </>
  );
}
