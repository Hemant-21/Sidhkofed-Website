'use client';

/** Official communication detail (bilingual). One operation for notices, circulars,
 *  orders, notifications and advisories (codex §4.6). Expiry is informational only. */

import type { CommunicationDetail } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDate } from '@/utils/format';
import { Badge } from '@/components/ui/badge';
import { BilingualTitle, BilingualLead, BilingualBody } from '@/components/content/bilingual';
import { DetailSection } from '@/components/content/detail-layout';
import { MetaList } from '@/components/content/meta-list';
import { DocumentLinks } from '@/components/content/document-links';

export function CommunicationArticle({ item }: { item: CommunicationDetail }) {
  const { language } = useLanguage();
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="primary">{pickText(item.communication_type.name_en, item.communication_type.name_hi, language)}</Badge>
      </div>
      <BilingualTitle en={item.title_en} hi={item.title_hi} />
      <BilingualLead en={item.summary_en} hi={item.summary_hi} />
      <BilingualBody en={item.body_en} hi={item.body_hi} />
    </>
  );
}

export function CommunicationAside({ item }: { item: CommunicationDetail }) {
  const { t, language } = useLanguage();
  return (
    <>
      <DetailSection title={t('detail.overview')}>
        <MetaList
          items={[
            { label: t('detail.referenceNo'), value: item.reference_number },
            { label: t('detail.issuedBy'), value: item.issuing_authority },
            { label: t('detail.publishDate'), value: formatDate(item.issue_date, language) },
            { label: t('detail.effectiveDate'), value: formatDate(item.effective_date, language) },
            { label: t('detail.expiryDate'), value: formatDate(item.expiry_date, language) },
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
