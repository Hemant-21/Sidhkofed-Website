'use client';

import Link from 'next/link';
import { TrendingUp, MapPin } from 'lucide-react';
import type { ProcurementSummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatDate, formatNumber, truncate } from '@/utils/format';
import { Card } from '@/components/ui/card';
import { Badge, HighlightBadge, StatusBadge } from '@/components/ui/badge';

export function ProcurementCard({ item }: { item: ProcurementSummary }) {
  const { language } = useLanguage();
  const title = pickText(item.title_en, item.title_hi, language);
  const summary = pickText(item.summary_en, item.summary_hi, language);
  const location =
    item.location_text || pickText(item.district?.name_en, item.district?.name_hi ?? null, language);

  return (
    <Card className="flex gap-4 p-4">
      <TrendingUp className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Badge tone="primary">
            {pickText(item.procurement_update_type.name_en, item.procurement_update_type.name_hi, language)}
          </Badge>
          {item.commodity && (
            <Badge tone="neutral">{pickText(item.commodity.name_en, item.commodity.name_hi, language)}</Badge>
          )}
          <StatusBadge status={item.status} />
          <HighlightBadge type={item.highlight_type} />
        </div>
        <h3 className="text-base font-semibold leading-snug text-foreground">
          <Link href={item.public_url} className="hover:text-primary hover:underline">
            {title}
          </Link>
        </h3>
        {summary && <p className="mt-1 text-sm text-muted-foreground">{truncate(summary, 150)}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {item.rate != null && (
            <span className="font-medium text-foreground">
              ₹ {formatNumber(item.rate, language)}
              {item.unit ? ` / ${item.unit}` : ''}
            </span>
          )}
          {item.effective_date && <span>w.e.f. {formatDate(item.effective_date, language)}</span>}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {location}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
