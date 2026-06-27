'use client';

/** A single public dashboard report: title, optional description, KPI tiles and a
 *  link to the full report page. */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { DashboardReport } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { MetricsGrid } from './metrics-grid';

export function ReportBlock({ report, linked = true }: { report: DashboardReport; linked?: boolean }) {
  const { t, language } = useLanguage();
  const title = pickText(report.title_en, report.title_hi, language);
  const description = pickText(report.description_en, report.description_hi, language);

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            <span className="border-l-4 border-primary pl-3">{title}</span>
          </h2>
          {description && <p className="mt-1 pl-4 text-sm text-muted-foreground">{description}</p>}
        </div>
        {linked && (
          <Link
            href={report.public_url}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t('common.viewDetails')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      <MetricsGrid metrics={report.metrics} />
    </section>
  );
}
