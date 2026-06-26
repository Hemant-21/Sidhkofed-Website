'use client';

import Link from 'next/link';
import { Building2, Globe } from 'lucide-react';
import type { InstitutionSummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { Card } from '@/components/ui/card';
import { CoverImage } from '@/components/content/cover-image';
import { Badge } from '@/components/ui/badge';

export function InstitutionCard({ institution }: { institution: InstitutionSummary }) {
  const { language } = useLanguage();
  const name = pickText(institution.name_en, institution.name_hi, language);

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-center gap-3">
        {institution.logo ? (
          <CoverImage media={institution.logo} fallbackAlt={name} className="h-12 w-12 shrink-0" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted" aria-hidden="true">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">
            <Link href={institution.public_url} className="hover:text-primary hover:underline">
              {name}
            </Link>
          </h3>
          <p className="text-xs text-muted-foreground">
            {pickText(institution.institution_type.name_en, institution.institution_type.name_hi, language)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {institution.district && (
          <Badge tone="neutral">{pickText(institution.district.name_en, institution.district.name_hi, language)}</Badge>
        )}
        {institution.website_url && (
          <a
            href={institution.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            Website
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
    </Card>
  );
}
