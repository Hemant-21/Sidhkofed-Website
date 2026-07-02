import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = buildMetadata({
  title: 'Success Stories',
  description: 'Impact stories from cooperative members and beneficiaries across Jharkhand.',
  path: '/activities/success-stories',
});

export default function SuccessStoriesPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Activities', href: '/activities' }, { label: 'Success Stories' }]} />
      <Container className="py-10">
        <header className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Success Stories</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Real impact from cooperative members and beneficiaries across Jharkhand.
          </p>
        </header>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">
            Success stories will be published here soon. Check back later.
          </p>
        </div>
      </Container>
    </>
  );
}
