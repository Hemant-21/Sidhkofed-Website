import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = buildMetadata({
  title: 'Notifications',
  description: 'Notices and tenders from SIDHKOFED, Government of Jharkhand.',
  path: '/notifications',
});

export default function NotificationsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Notifications' }]} />
      <Container className="py-10">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Notifications</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Official notices, circulars and tender documents from SIDHKOFED.
          </p>
        </header>

        <nav aria-label="Notifications sections" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/notifications/notices"
            className="group rounded-lg border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-foreground group-hover:text-primary">Notices</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Public notices, circulars, office orders and advisories issued by SIDHKOFED.
            </p>
          </Link>
          <Link
            href="/notifications/tenders"
            className="group rounded-lg border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-foreground group-hover:text-primary">Tenders</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Active and upcoming tenders. Bidding documents are managed on the GeM portal.
            </p>
          </Link>
        </nav>
      </Container>
    </>
  );
}
