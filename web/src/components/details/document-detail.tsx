'use client';

/** Document detail view (bilingual). Public files open in a new tab for preview with
 *  a separate download action; no download tracking (codex §4.5). */

import { FileText, Eye, Download } from 'lucide-react';
import type { DocumentDetail } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDate } from '@/utils/format';
import { Badge } from '@/components/ui/badge';
import { BilingualTitle, BilingualBody } from '@/components/content/bilingual';
import { DetailSection } from '@/components/content/detail-layout';
import { MetaList } from '@/components/content/meta-list';
import { Chips } from '@/components/content/chips';

export function DocumentArticle({ document }: { document: DocumentDetail }) {
  const { t, language } = useLanguage();
  const fileUrl = document.file?.file_url;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="primary">{pickText(document.document_type.name_en, document.document_type.name_hi, language)}</Badge>
        {document.knowledge_category && (
          <Badge tone="neutral">
            {pickText(document.knowledge_category.name_en, document.knowledge_category.name_hi, language)}
          </Badge>
        )}
      </div>

      <BilingualTitle en={document.title_en} hi={document.title_hi} />

      <p className="mt-2 text-sm text-muted-foreground">
        {document.publication_date && (
          <>
            {t('common.publishedOn')} {formatDate(document.publication_date, language)}
          </>
        )}
        {document.language && <span className="uppercase"> · {document.language}</span>}
      </p>

      {fileUrl && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <FileText className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{document.file.file_name}</p>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {t('common.preview')}
            <span className="sr-only">({t('common.opensNewTab')})</span>
          </a>
          <a
            href={fileUrl}
            download
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('common.download')}
          </a>
        </div>
      )}

      <BilingualBody en={document.description_en} hi={document.description_hi} />
    </>
  );
}

export function DocumentAside({ document }: { document: DocumentDetail }) {
  const { t, language } = useLanguage();
  const commodities = document.commodities.map((c) => ({ label: pickText(c.name_en, c.name_hi, language) }));
  const districts = document.districts.map((d) => ({ label: pickText(d.name_en, d.name_hi, language) }));
  const tags = document.tags.map((tg) => ({ label: pickText(tg.name_en, tg.name_hi, language) }));

  return (
    <>
      <DetailSection title={t('detail.overview')}>
        <MetaList
          items={[
            { label: t('filter.type'), value: pickText(document.document_type.name_en, document.document_type.name_hi, language) },
            {
              label: t('filter.year'),
              value: document.financial_year?.label ?? null,
            },
          ]}
        />
      </DetailSection>
      {commodities.length > 0 && (
        <DetailSection title={t('detail.commodities')}>
          <Chips items={commodities} />
        </DetailSection>
      )}
      {districts.length > 0 && (
        <DetailSection title={t('filter.district')}>
          <Chips items={districts} />
        </DetailSection>
      )}
      {tags.length > 0 && (
        <DetailSection title="Tags">
          <Chips items={tags} />
        </DetailSection>
      )}
    </>
  );
}
