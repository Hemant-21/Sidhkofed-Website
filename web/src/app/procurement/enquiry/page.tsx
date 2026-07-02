import type { Metadata } from 'next';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = buildMetadata({
  title: 'Buyer / Seller Enquiry',
  description: 'Contact SIDHKOFED for procurement enquiries — MFP and cooperative commodities.',
  path: '/procurement/enquiry',
});

export default function ProcurementEnquiryPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Procurement', href: '/procurement' }, { label: 'Buyer / Seller Enquiry' }]} />
      <Container className="py-10">
        <header className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Buyer / Seller Enquiry</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Interested in purchasing SIDHKOFED commodities or selling Minor Forest Produce through our
            procurement network? Reach out to us directly.
          </p>
        </header>

        <div className="max-w-xl rounded-lg border border-border bg-surface p-8 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-foreground">SIDHKOFED Procurement Office</h2>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>Sameti Bhawan, Kanke Road, Ranchi, Jharkhand – 834008</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <a href="tel:06512913012" className="hover:text-primary hover:underline">0651-2913012</a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <a href="mailto:sidhokanhofed@gmail.com" className="hover:text-primary hover:underline">
                sidhokanhofed@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Clock className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>Monday – Friday, 10:00 AM – 6:00 PM</span>
            </li>
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Please mention the commodity, quantity and your district when writing to us.
          </p>
        </div>
      </Container>
    </>
  );
}
