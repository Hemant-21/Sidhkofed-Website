'use client';

import Link from 'next/link';
import { Wrench } from 'lucide-react';
import type { ToolkitSummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { truncate } from '@/utils/format';
import { Card } from '@/components/ui/card';
import { Badge, HighlightBadge } from '@/components/ui/badge';

export function ToolkitCard({ toolkit }: { toolkit: ToolkitSummary }) {
  const { language } = useLanguage();
  const title = pickText(toolkit.title_en, toolkit.title_hi, language);
  const summary = pickText(toolkit.summary_en, toolkit.summary_hi, language);

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {toolkit.commodity && (
          <Badge tone="primary">{pickText(toolkit.commodity.name_en, toolkit.commodity.name_hi, language)}</Badge>
        )}
        <HighlightBadge type={toolkit.highlight_type} />
      </div>
      <div className="flex flex-1 items-start gap-3">
        <Wrench className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-foreground">
            <Link href={toolkit.public_url} className="hover:text-primary hover:underline">
              {title}
            </Link>
          </h3>
          {toolkit.programme && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pickText(toolkit.programme.title_en, toolkit.programme.title_hi, language)}
            </p>
          )}
          {summary && <p className="mt-1.5 text-sm text-muted-foreground">{truncate(summary, 120)}</p>}
        </div>
      </div>
    </Card>
  );
}
