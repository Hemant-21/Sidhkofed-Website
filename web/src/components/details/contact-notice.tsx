'use client';

/** Honest-state notice for the contact/enquiry route. A secure public enquiry
 *  endpoint exists, but without the CAPTCHA/abuse-protection wiring in this
 *  environment we do not present a submitting form (build-context §3/§6). */

import { useLanguage } from '@/providers/language-provider';
import { Alert } from '@/components/ui/alert';

export function ContactNotice() {
  const { t } = useLanguage();
  return (
    <Alert tone="warning" className="mt-6">
      {t('contact.formUnavailable')}
    </Alert>
  );
}
