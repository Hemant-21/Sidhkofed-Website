import type { Metadata } from 'next';
import { getOneSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { PageDetail } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { LocalizedHeading, LocalizedText } from '@/components/listing/localized-heading';
import { CmsPageBody } from '@/components/details/cms-page';
import { ContactNotice } from '@/components/details/contact-notice';

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: 'Contact us',
  description: 'Reach the SIDHKOFED office.',
  path: '/contact',
});

// Office details are authored as a CMS Page (codex §4.10); there is no public
// settings endpoint, so we render the `contact` page when present and fall back to
// a labelled placeholder otherwise (honest content state).
export default async function ContactPage() {
  const page = await getOneSafe<PageDetail>(detailPath(PUBLIC_ENDPOINTS.pages, 'contact'));

  return (
    <>
      <Breadcrumbs items={[{ label: 'Contact' }]} />
      <Container className="py-8">
        <article className="mx-auto max-w-3xl">
          {page ? (
            <CmsPageBody page={page} />
          ) : (
            <header>
              <LocalizedHeading titleKey="page.contact.title" as="h1" />
              <LocalizedText textKey="page.contact.subtitle" className="-mt-1 text-muted-foreground" />
            </header>
          )}
          <ContactNotice />
        </article>
      </Container>
    </>
  );
}
