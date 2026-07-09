import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { getListSafe } from '@/lib/api/server';
import { getContactSettings } from '@/lib/contact-settings';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { MasterRef } from '@/lib/types/api';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { LocalizedHeading, LocalizedText } from '@/components/listing/localized-heading';
import { EnquiryForm } from '@/components/forms/enquiry-form';
import { OfficeContactCard } from '@/components/content/office-contact-card';

export const metadata: Metadata = buildMetadata({
  title: 'Contact us',
  description: 'Reach the SIDHKOFED office.',
  path: '/contact',
});

export default async function ContactPage() {
  // Same pattern as /procurement/enquiry: enquiry types + contact settings fetched
  // server-side so the client form and office card never need their own round trips.
  const [{ items: enquiryTypes }, contactSettings] = await Promise.all([
    getListSafe<MasterRef>(`${PUBLIC_ENDPOINTS.masters}/enquiry-types`, {
      query: { page_size: 100 },
      revalidate: 3600,
    }),
    getContactSettings(),
  ]);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Contact' }]} />
      <Container className="py-10">
        <header className="mb-8 max-w-2xl">
          <LocalizedHeading titleKey="page.contact.title" as="h1" />
          <LocalizedText textKey="page.contact.subtitle" className="mt-3 text-lg text-muted-foreground" />
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
              <EnquiryForm enquiryTypes={enquiryTypes} />
            </div>
          </div>

          <div className="lg:max-w-none">
            <OfficeContactCard settings={contactSettings} fallbackHeadingKey="contact.fallbackHeading.general" />
          </div>
        </div>
      </Container>
    </>
  );
}
