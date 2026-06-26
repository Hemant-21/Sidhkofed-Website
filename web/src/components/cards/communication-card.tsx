'use client';

import Link from 'next/link';
import { Megaphone, CalendarDays } from 'lucide-react';
import type { CommunicationSummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDate, truncate } from '@/utils/format';
import { Card } from '@/components/ui/card';
import { Badge, HighlightBadge } from '@/components/ui/badge';

export function CommunicationCard({ item }: { item: CommunicationSummary }) {
  const { language } = useLanguage();
  const title = pickText(item.title_en, item.title_hi, language);
  const summary = pickText(item.summary_en, item.summary_hi, language);

  return (
    <Card className="flex gap-4 p-4">
      <Megaphone className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Badge tone="primary">
            {pickText(item.communication_type.name_en, item.communication_type.name_hi, language)}
          </Badge>
          <HighlightBadge type={item.highlight_type} />
          {item.reference_number && (
            <span className="text-xs text-muted-foreground">#{item.reference_number}</span>
          )}
        </div>
        <h3 className="text-base font-semibold leading-snug text-foreground">
          <Link href={item.public_url} className="hover:text-primary hover:underline">
            {title}
          </Link>
        </h3>
        {summary && <p className="mt-1 text-sm text-muted-foreground">{truncate(summary, 160)}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {item.issue_date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(item.issue_date, language)}
            </span>
          )}
          {item.issuing_authority && <span>{item.issuing_authority}</span>}
        </div>
      </div>
    </Card>
  );
}
