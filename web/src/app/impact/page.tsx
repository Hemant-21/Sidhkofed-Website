import type { Metadata } from 'next';
import { BarChart3 } from 'lucide-react';
import { getOneSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { KpisResponse } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { CategoryCards, type CategoryCardDef } from '@/components/listing/category-cards';
import { LocalizedHero } from '@/components/listing/localized-heading';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Our Impact',
  description: 'SIDHKOFED impact across Jharkhand — beneficiaries, training coverage and procurement figures.',
  path: '/impact',
});

/**
 * Orphaned landing page — the "Dashboard" nav item now links straight to
 * /impact/dashboard (which has its own KPI strip and grouped reports), since the
 * Training & Beneficiary listing this page used to show was redundant with Activities'
 * own "Trainings & Capacity Building" category (same event_type=training data). Left in
 * place rather than deleted/redirected — a later dead-code pass can retire it.
 */
const IMPACT_CATEGORIES: CategoryCardDef[] = [
  {
    icon: <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />,
    titleKey: 'page.dashboard.title',
    descriptionKey: 'page.dashboard.subtitle',
    href: '/impact/dashboard',
  },
];

export default async function ImpactPage() {
  const kpis = await getOneSafe<KpisResponse>(PUBLIC_ENDPOINTS.dashboardKpis);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Impact' }]} />

      {/* Page header — same band style as /publications */}
      <LocalizedHero titleKey="page.impact.title" subtitleKey="page.impact.subtitle" />

      {kpis && kpis.kpis.length > 0 ? (
        <Container className="py-8">
          <KpiStrip reports={kpis.kpis} />
        </Container>
      ) : null}

      {/* Browse by Category */}
      <div className="border-b border-border bg-muted/40">
        <Container className="py-8">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <span className="border-l-4 border-primary pl-3">Browse by Category</span>
          </h2>
          <CategoryCards categories={IMPACT_CATEGORIES} />
        </Container>
      </div>
    </>
  );
}
