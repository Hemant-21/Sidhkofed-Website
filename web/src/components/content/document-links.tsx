'use client';

/**
 * Linked-document list used on detail pages (events, communications, procurement).
 * Documents are uploaded once and linked by reference (codex §4.5); public files
 * open in a new tab for preview with a separate download action. No tracking.
 */

import { FileText, Eye, Download } from 'lucide-react';
import type { DocumentLinkRef } from '@/lib/types/api';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { humanizeEnum } from '@/utils/format';

export function DocumentLinks({ documents }: { documents: DocumentLinkRef[] }) {
  const { t, language } = useLanguage();
  if (documents.length === 0) return null;

  return (
    <ul className="space-y-2">
      {documents.map((doc) => {
        const title = pickText(doc.title_en, doc.title_hi, language);
        return (
          <li
            key={doc.id}
            className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface p-3"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{humanizeEnum(doc.document_type)}</p>
              </div>
            </div>
            {doc.file_url && (
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                  aria-label={`${t('common.preview')}: ${title}`}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">{t('common.preview')}</span>
                  <span className="sr-only">({t('common.opensNewTab')})</span>
                </a>
                <a
                  href={doc.file_url}
                  download
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  aria-label={`${t('common.download')}: ${title}`}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">{t('common.download')}</span>
                </a>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
