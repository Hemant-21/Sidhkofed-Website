import type { Metadata } from 'next';
import Link from 'next/link';
import { getOneSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { KpisResponse } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { KpiStrip } from '@/components/dashboard/kpi-strip';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Our Impact',
  description: 'SIDHKOFED impact across Jharkhand — beneficiaries, training coverage and procurement figures.',
  path: '/impact',
});

export default async function ImpactPage() {
  const kpis = await getOneSafe<KpisResponse>(PUBLIC_ENDPOINTS.dashboardKpis);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Impact' }]} />
      <Container className="py-10">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Our Impact</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            SIDHKOFED&apos;s reach across Jharkhand — beneficiaries served, training delivered, and procurement
            facilitated.
          </p>
        </header>

        {kpis && kpis.kpis.length > 0 && (
          <section aria-label="Key performance indicators" className="mb-10">
            <KpiStrip reports={kpis.kpis} />
          </section>
        )}

        <nav aria-label="Impact sections" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/impact/dashboard"
            className="group rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-foreground group-hover:text-primary">Public Dashboard</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Detailed public reports and impact metrics sourced from the CMS.
            </p>
          </Link>
          <Link
            href="/impact/training-beneficiaries"
            className="group rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
              Training &amp; Beneficiaries
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Training reach, district-wise coverage and beneficiary statistics.
            </p>
          </Link>
          <Link
            href="/activities"
            className="group rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-foreground group-hover:text-primary">Activities</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              View all trainings, workshops, meetings and field visits.
            </p>
          </Link>
        </nav>
      </Container>
    </>
  );
}
