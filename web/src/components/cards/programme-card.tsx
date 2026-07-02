'use client';

import Link from 'next/link';
import type { ProgrammeSummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { truncate } from '@/utils/format';
import { Card } from '@/components/ui/card';
import { CoverImage } from '@/components/content/cover-image';
import { Badge, HighlightBadge } from '@/components/ui/badge';

export function ProgrammeCard({ programme }: { programme: ProgrammeSummary }) {
  const { language } = useLanguage();
  const title = pickText(programme.title_en, programme.title_hi, language);
  const summary = pickText(programme.summary_en, programme.summary_hi, language);

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={programme.public_url} className="block focus-visible:outline-none">
        <CoverImage media={programme.cover_media} fallbackAlt={title} className="aspect-[16/9] w-full" rounded={false} />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {programme.short_code && <Badge tone="primary">{programme.short_code}</Badge>}
          <HighlightBadge type={programme.highlight_type} />
        </div>
        <h3 className="text-base font-semibold leading-snug text-foreground">
          <Link href={programme.public_url} className="hover:text-primary hover:underline">
            {title}
          </Link>
        </h3>
        {summary && <p className="mt-1.5 text-sm text-muted-foreground">{truncate(summary, 130)}</p>}
      </div>
    </Card>
  );
}
