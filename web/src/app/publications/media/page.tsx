import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Media Gallery',
  description: 'Photo and video gallery of SIDHKOFED activities and events.',
  path: '/publications/media',
});

export default function MediaGalleryPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Publications', href: '/publications' }, { label: 'Media Gallery' }]} />
      <Container className="py-10">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Media Gallery</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Photo and video archive of SIDHKOFED activities, events and programmes.
          </p>
        </header>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">
            Media gallery coming soon. Photo and video content is being organised.
          </p>
        </div>
      </Container>
    </>
  );
}
