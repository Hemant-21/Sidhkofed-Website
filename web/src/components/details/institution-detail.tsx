'use client';

/** Institution/partner detail view (bilingual). Shows approved contact fields,
 *  district and an external website that opens safely in a new tab (codex §4.4). */

import { Building2, Globe, Mail, Phone, MapPin } from 'lucide-react';
import type { InstitutionDetail } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { Badge } from '@/components/ui/badge';
import { CoverImage } from '@/components/content/cover-image';
import { BilingualTitle, BilingualBody } from '@/components/content/bilingual';
import { DetailSection } from '@/components/content/detail-layout';

export function InstitutionArticle({ institution }: { institution: InstitutionDetail }) {
  const { language } = useLanguage();
  const name = pickText(institution.name_en, institution.name_hi, language);

  return (
    <>
      <div className="flex items-center gap-4">
        {institution.logo ? (
          <CoverImage media={institution.logo} fallbackAlt={name} className="h-16 w-16 shrink-0" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted" aria-hidden="true">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </span>
        )}
        <div className="min-w-0">
          <BilingualTitle en={institution.name_en} hi={institution.name_hi} className="text-2xl font-bold text-foreground" />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone="primary">
              {pickText(institution.institution_type.name_en, institution.institution_type.name_hi, language)}
            </Badge>
            {institution.district && (
              <Badge tone="neutral">{pickText(institution.district.name_en, institution.district.name_hi, language)}</Badge>
            )}
          </div>
        </div>
      </div>

      <BilingualBody en={institution.description_en} hi={institution.description_hi} />
    </>
  );
}

export function InstitutionAside({ institution }: { institution: InstitutionDetail }) {
  const { t, language } = useLanguage();
  const address = pickText(institution.address_en, institution.address_hi, language);

  const hasContact =
    address || institution.contact_email || institution.contact_phone || institution.website_url;
  if (!hasContact) return null;

  return (
    <DetailSection title={t('detail.contactInfo')}>
      <ul className="space-y-3 text-sm">
        {address && (
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{address}</span>
          </li>
        )}
        {institution.contact_phone && (
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <a href={`tel:${institution.contact_phone}`} className="hover:text-primary hover:underline">
              {institution.contact_phone}
            </a>
          </li>
        )}
        {institution.contact_email && (
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <a href={`mailto:${institution.contact_email}`} className="hover:text-primary hover:underline">
              {institution.contact_email}
            </a>
          </li>
        )}
        {institution.website_url && (
          <li className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <a
              href={institution.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {t('detail.visitWebsite')}
              <span className="sr-only">({t('common.opensNewTab')})</span>
            </a>
          </li>
        )}
      </ul>
    </DetailSection>
  );
}
