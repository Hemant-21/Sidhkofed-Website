'use client';

/**
 * Office contact info card — reused by `/contact` and `/procurement/enquiry`. Renders
 * live data from Settings → Contact (`GET /public/settings/contact`, `getContactSettings()`),
 * never hardcoded. Each field is hidden individually when blank (the CMS field hasn't been
 * filled in yet), and the whole card renders nothing when every field is blank — an honest
 * empty state rather than a card full of empty rows.
 */

import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { ExternalLink } from '@/components/ui/external-link';
import type { PublicContactSettings } from '@/lib/types/settings';

export function OfficeContactCard({
  settings,
  fallbackHeadingKey,
}: {
  settings: PublicContactSettings | null;
  /** i18n key used when Settings → Contact has no Office Name set yet. */
  fallbackHeadingKey: string;
}) {
  const { t } = useLanguage();
  if (!settings) return null;

  const address = settings['contact.address'].trim();
  const phone = settings['contact.phone'].trim();
  const email = settings['contact.email'].trim();
  const hours = settings['contact.office_hours'].trim();
  const mapUrl = settings['contact.map_url'].trim();
  const officeName = settings['contact.office_name'].trim();

  const hasAny = [address, phone, email, hours].some((v) => v !== '');
  if (!hasAny) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-foreground">
        {officeName !== '' ? officeName : t(fallbackHeadingKey)}
      </h2>
      <ul className="space-y-4 text-sm text-muted-foreground">
        {address !== '' ? (
          <li className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="sr-only">{t('contact.address')}: </span>
              {address}
            </span>
          </li>
        ) : null}
        {phone !== '' ? (
          <li className="flex items-center gap-3">
            <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="hover:text-primary hover:underline">
              <span className="sr-only">{t('contact.phone')}: </span>
              {phone}
            </a>
          </li>
        ) : null}
        {email !== '' ? (
          <li className="flex items-center gap-3">
            <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <a href={`mailto:${email}`} className="hover:text-primary hover:underline">
              <span className="sr-only">{t('contact.email')}: </span>
              {email}
            </a>
          </li>
        ) : null}
        {hours !== '' ? (
          <li className="flex items-center gap-3">
            <Clock className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="sr-only">{t('contact.hours')}: </span>
              {hours}
            </span>
          </li>
        ) : null}
      </ul>
      {mapUrl !== '' ? (
        <ExternalLink
          href={mapUrl}
          newTabLabel={t('common.opensNewTab')}
          className="mt-5 text-sm text-primary hover:underline"
        >
          {t('contact.map')}
        </ExternalLink>
      ) : null}
    </div>
  );
}
