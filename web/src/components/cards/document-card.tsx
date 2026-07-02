'use client';

import Link from 'next/link';
import { FileText, Download, Eye } from 'lucide-react';
import type { DocumentSummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDate } from '@/utils/format';
import { Card } from '@/components/ui/card';
import { Badge, HighlightBadge } from '@/components/ui/badge';

/**
 * Document card. Public documents open in a new tab for preview and offer a
 * separate download action (codex §4.5). Downloads/previews use the backend
 * `file.file_url`; no download tracking.
 */
export function DocumentCard({ document }: { document: DocumentSummary }) {
  const { t, language } = useLanguage();
  const title = pickText(document.title_en, document.title_hi, language);
  const fileUrl = document.file?.file_url;

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="primary">{pickText(document.document_type.name_en, document.document_type.name_hi, language)}</Badge>
        {document.knowledge_category && (
          <Badge tone="neutral">
            {pickText(document.knowledge_category.name_en, document.knowledge_category.name_hi, language)}
          </Badge>
        )}
        <HighlightBadge type={document.highlight_type} />
      </div>

      <div className="flex flex-1 items-start gap-3">
        <FileText className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-foreground">
            <Link href={document.public_url} className="hover:text-primary hover:underline">
              {title}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {document.publication_date && (
              <>
                {t('common.publishedOn')} {formatDate(document.publication_date, language)}
              </>
            )}
            {document.language && <span className="uppercase"> · {document.language}</span>}
          </p>
        </div>
      </div>

      {fileUrl && (
        <div className="mt-4 flex items-center gap-2">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {t('common.preview')}
            <span className="sr-only">({t('common.opensNewTab')})</span>
          </a>
          <a
            href={fileUrl}
            download
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {t('common.download')}
          </a>
        </div>
      )}
    </Card>
  );
}
