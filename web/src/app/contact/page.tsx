import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { LocalizedHeading, LocalizedText } from '@/components/listing/localized-heading';
import { ContactNotice } from '@/components/details/contact-notice';

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: 'Contact us',
  description: 'Reach the SIDHKOFED office.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Contact' }]} />
      <Container className="py-8">
        <article className="mx-auto max-w-3xl">
          <header>
            <LocalizedHeading titleKey="page.contact.title" as="h1" />
            <LocalizedText textKey="page.contact.subtitle" className="-mt-1 text-muted-foreground" />
          </header>
          <ContactNotice />
        </article>
      </Container>
    </>
  );
}
