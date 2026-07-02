import type { Metadata } from 'next';
import Link from 'next/link';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { ProcurementSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { ProcurementCard } from '@/components/cards/procurement-card';
import { EmptyState } from '@/components/feedback/states';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Procurement',
  description: 'Minor forest produce and commodity procurement by SIDHKOFED across Jharkhand.',
  path: '/procurement',
});

export default async function ProcurementPage() {
  const featured = await getListSafe<ProcurementSummary>(PUBLIC_ENDPOINTS.procurement, {
    query: { page_size: 6, ordering: '-effective_date' },
  });

  return (
    <>
      <Breadcrumbs items={[{ label: 'Procurement' }]} />
      <Container className="py-10">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Procurement</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            SIDHKOFED facilitates procurement of Minor Forest Produce (MFP) and agricultural commodities
            at fair prices across Jharkhand.
          </p>
        </header>

        <nav aria-label="Procurement sections" className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/procurement/announcements"
            className="group rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-foreground group-hover:text-primary">Announcements</h2>
            <p className="mt-1 text-sm text-muted-foreground">Rates, schedules and centre updates.</p>
          </Link>
          <Link
            href="/procurement/upcoming"
            className="group rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-foreground group-hover:text-primary">Upcoming Procurement</h2>
            <p className="mt-1 text-sm text-muted-foreground">Scheduled and upcoming procurement drives.</p>
          </Link>
          <Link
            href="/procurement/enquiry"
            className="group rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-foreground group-hover:text-primary">Buyer / Seller Enquiry</h2>
            <p className="mt-1 text-sm text-muted-foreground">Send an enquiry for SIDHKOFED commodities.</p>
          </Link>
        </nav>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Recent Announcements</h2>
          {featured.items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {featured.items.map((item) => (
                <ProcurementCard key={item.id} item={item} />
              ))}
            </div>
          )}
          {featured.pagination.total_pages > 1 && (
            <div className="mt-6 text-center">
              <Link href="/procurement/announcements" className="text-sm font-medium text-primary hover:underline">
                View all announcements →
              </Link>
            </div>
          )}
        </section>
      </Container>
    </>
  );
}
