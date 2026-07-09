import type { Metadata } from 'next';
import { BarChart3 } from 'lucide-react';
import { getListSafe, getOneSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { EventSummary, KpisResponse } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions, yearOptions } from '@/lib/listing';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { CategoryCards, type CategoryCardDef } from '@/components/listing/category-cards';
import { LocalizedHero } from '@/components/listing/localized-heading';
import { EmptyState } from '@/components/feedback/states';
import { EventCard } from '@/components/cards/event-card';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Our Impact',
  description: 'SIDHKOFED impact across Jharkhand — beneficiaries, training coverage and procurement figures.',
  path: '/impact',
});

type SP = Record<string, string | string[] | undefined>;

/**
 * Browse-by-category shortcuts. Public Dashboard is fixed, pre-computed report content
 * (`/public/dashboard`, rendered via `ReportBlock`) — not a filterable list, so it can't be a
 * same-page category the way training/workshop/meeting was for Activities. It stays a
 * separate page, same treatment as Tenders (Notifications) and Buyer/Seller/Storage Enquiry
 * (Procurement). Training & Beneficiary Impact IS a real filterable list (the same Events
 * endpoint Activities uses, scoped to event_type=training), so it becomes the default
 * same-page content of /impact itself — same reasoning as Notices absorbing into
 * /notifications.
 */
const IMPACT_CATEGORIES: CategoryCardDef[] = [
  {
    icon: <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />,
    titleKey: 'page.dashboard.title',
    descriptionKey: 'page.dashboard.subtitle',
    href: '/impact/dashboard',
  },
];

export default async function ImpactPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [kpis, list, districts] = await Promise.all([
    getOneSafe<KpisResponse>(PUBLIC_ENDPOINTS.dashboardKpis),
    getListSafe<EventSummary>(PUBLIC_ENDPOINTS.events, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        event_type: 'training',
        district: qstr(searchParams.district),
        year: qstr(searchParams.year),
        ordering: '-start_date',
      },
    }),
    getMasterOptions('districts'),
  ]);

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

      {/* Full listing (Training & Beneficiary) — same-page filters */}
      <Container id="listing" className="scroll-mt-24 py-8">
        <header className="mb-6">
          <h2 className="text-xl font-bold text-foreground">All Training &amp; Beneficiary Activities</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Training reach, district coverage and beneficiary statistics. Filter by district and year.
          </p>
        </header>
        <div className="mb-2">
          <FilterBar
            selects={[
              { key: 'district', labelKey: 'filter.district', options: districts },
              { key: 'year', labelKey: 'filter.year', options: yearOptions() },
            ]}
          />
        </div>
        <ResultsSummary total={list.pagination.total_items} />
        {list.items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.items.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
        <PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />
      </Container>
    </>
  );
}
