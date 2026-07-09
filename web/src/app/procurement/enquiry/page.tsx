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
  title: 'Buyer / Seller / Storage Enquiry',
  description: 'Contact SIDHKOFED for procurement and storage enquiries — MFP and cooperative commodities.',
  path: '/procurement/enquiry',
});

/**
 * Only these three enquiry-type slugs belong on the Buyer/Seller/Storage Enquiry page — the
 * master list also seeds General/Membership/Partnership enquiry types, which belong on the
 * general `/contact` page instead (masters.ts → ENQUIRY_TYPES; slugs are server-generated and
 * immutable, so matching on them is stable even if an admin edits the display name).
 */
const PROCUREMENT_ENQUIRY_TYPE_SLUGS = new Set(['buyer-enquiry', 'seller-enquiry', 'storage-godown-enquiry']);

export default async function ProcurementEnquiryPage() {
  // Enquiry types + commodities are fetched server-side (SSR) so the client form never needs
  // its own master-data round trips. Cached for an hour — both master lists change rarely.
  const [{ items: allEnquiryTypes }, { items: commodities }, contactSettings] = await Promise.all([
    getListSafe<MasterRef>(`${PUBLIC_ENDPOINTS.masters}/enquiry-types`, {
      query: { page_size: 100 },
      revalidate: 3600,
    }),
    getListSafe<MasterRef>(`${PUBLIC_ENDPOINTS.masters}/commodities`, {
      query: { page_size: 100 },
      revalidate: 3600,
    }),
    getContactSettings(),
  ]);

  const enquiryTypes = allEnquiryTypes.filter((t) => PROCUREMENT_ENQUIRY_TYPE_SLUGS.has(t.slug));

  return (
    <>
      <Breadcrumbs items={[{ label: 'Procurement', href: '/procurement' }, { label: 'Buyer / Seller / Storage Enquiry' }]} />
      <Container className="py-10">
        <header className="mb-8 max-w-2xl">
          <LocalizedHeading titleKey="page.procurement.enquiry.title" as="h1" />
          <LocalizedText textKey="page.procurement.enquiry.subtitle" className="mt-3 text-lg text-muted-foreground" />
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
              <EnquiryForm enquiryTypes={enquiryTypes} commodities={commodities} />
            </div>
          </div>

          <div className="lg:max-w-none">
            <OfficeContactCard settings={contactSettings} fallbackHeadingKey="contact.fallbackHeading.procurement" />
          </div>
        </div>
      </Container>
    </>
  );
}
