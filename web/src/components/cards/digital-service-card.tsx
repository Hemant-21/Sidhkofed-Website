'use client';

import { AppWindow, ArrowUpRight } from 'lucide-react';
import type { DigitalService } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { truncate } from '@/utils/format';
import { Card } from '@/components/ui/card';
import { CoverImage } from '@/components/content/cover-image';

/** Digital service link card — always opens the external service in a new tab. */
export function DigitalServiceCard({ service }: { service: DigitalService }) {
  const { t, language } = useLanguage();
  const name = pickText(service.title_en, service.title_hi, language);
  const desc = pickText(service.description_en, service.description_hi, language);

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <a
        href={service.external_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full items-start gap-3 p-4"
      >
        {service.icon ? (
          <CoverImage media={service.icon} fallbackAlt={name} className="h-11 w-11 shrink-0" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10" aria-hidden="true">
            <AppWindow className="h-6 w-6 text-primary" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 text-base font-semibold text-foreground">
            {name}
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">({t('common.opensNewTab')})</span>
          </h3>
          {desc && <p className="mt-1 text-sm text-muted-foreground">{truncate(desc, 110)}</p>}
        </div>
      </a>
    </Card>
  );
}
