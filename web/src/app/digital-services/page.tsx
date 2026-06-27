import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { DigitalService } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { LocalizedHeading, LocalizedText } from '@/components/listing/localized-heading';
import { DigitalServiceCard } from '@/components/cards/digital-service-card';
import { EmptyState } from '@/components/feedback/states';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Digital services',
  description: 'Online services and external systems. Links open in a new tab.',
  path: '/digital-services',
});

// Digital services are controlled external links (codex §4.14). The card always
// opens the service in a new tab via rel=noopener; we never fake an integration.
export default async function DigitalServicesPage() {
  const list = await getListSafe<DigitalService>(PUBLIC_ENDPOINTS.digitalServices, {
    query: { page_size: 100 },
  });

  return (
    <>
      <Breadcrumbs items={[{ label: 'Digital services' }]} />
      <Container className="py-8">
        <header className="mb-6">
          <LocalizedHeading titleKey="page.digitalServices.title" as="h1" />
          <LocalizedText textKey="page.digitalServices.subtitle" className="-mt-1 max-w-3xl text-muted-foreground" />
        </header>

        {list.items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.items.map((service) => (
              <DigitalServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
