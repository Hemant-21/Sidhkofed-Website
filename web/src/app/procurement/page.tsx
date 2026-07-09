import type { Metadata } from 'next';
import { Clock, IndianRupee, Building2, Handshake } from 'lucide-react';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { ProcurementSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions, yearOptions } from '@/lib/listing';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { CategoryCards, type CategoryCardDef } from '@/components/listing/category-cards';
import { LocalizedHero } from '@/components/listing/localized-heading';
import { EmptyState } from '@/components/feedback/states';
import { ProcurementCard } from '@/components/cards/procurement-card';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Procurement',
  description: 'Minor forest produce and commodity procurement by SIDHKOFED across Jharkhand.',
  path: '/procurement',
});

type SP = Record<string, string | string[] | undefined>;

const ICON_CLASS = 'h-5 w-5 text-primary';

/**
 * Browse-by-category shortcuts. "Announcements" is excluded — /procurement itself is already
 * that default, unfiltered view (same reasoning as excluding "Activities Overview"). "Upcoming"
 * is a date-based view (see below); "Procurement Rate" and "Procurement Centre Update" are two
 * of the six real `procurement-update-types` master values (masters.ts → PROCUREMENT_UPDATE_TYPES)
 * surfaced as cards, exactly like Activities curated training/workshop/meeting out of its 9
 * event-types — both deep-link into the same-page listing via `procurement_update_type`, which
 * the Type filter below already reads (same query-param-as-source-of-truth pattern).
 *
 * "Upcoming" itself isn't a type value — it's `?upcoming=true#listing`, read by the Timing
 * filter's boolean-style option instead.
 *
 * Buyer/Seller/Storage Enquiry has its own dedicated form (`/procurement/enquiry`) and stays a
 * separate page, same treatment as Success Stories on the Activities page.
 */
const PROCUREMENT_CATEGORIES: CategoryCardDef[] = [
  {
    icon: <Clock className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.procurement.upcoming.title',
    descriptionKey: 'page.procurement.upcoming.subtitle',
    href: '/procurement?upcoming=true#listing',
  },
  {
    icon: <IndianRupee className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.procurement.rate.title',
    descriptionKey: 'page.procurement.rate.subtitle',
    href: '/procurement?procurement_update_type=procurement-rate#listing',
  },
  {
    icon: <Building2 className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.procurement.centreUpdate.title',
    descriptionKey: 'page.procurement.centreUpdate.subtitle',
    href: '/procurement?procurement_update_type=procurement-centre-update#listing',
  },
  {
    icon: <Handshake className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.procurement.enquiry.title',
    descriptionKey: 'page.procurement.enquiry.subtitle',
    href: '/procurement/enquiry',
  },
];

/** The Timing filter's one real option; FilterBar always prepends its own "All" placeholder. */
const TIMING_OPTIONS = [{ value: 'true', name_en: 'Upcoming only', name_hi: 'केवल आगामी' }];

export default async function ProcurementPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);
  const upcoming = qstr(searchParams.upcoming) === 'true';
  const today = new Date().toISOString().slice(0, 10);

  const [list, updateTypes, commodities, districts] = await Promise.all([
    getListSafe<ProcurementSummary>(PUBLIC_ENDPOINTS.procurement, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        procurement_update_type: qstr(searchParams.procurement_update_type),
        commodity: qstr(searchParams.commodity),
        district: qstr(searchParams.district),
        year: qstr(searchParams.year),
        effective_date_from: upcoming ? today : undefined,
        ordering: upcoming ? 'effective_date' : '-effective_date',
      },
    }),
    getMasterOptions('procurement-update-types'),
    getMasterOptions('commodities'),
    getMasterOptions('districts'),
  ]);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Procurement' }]} />

      {/* Page header — same band style as /publications */}
      <LocalizedHero titleKey="page.procurement.title" subtitleKey="page.procurement.subtitle" />

      {/* Browse by Category */}
      <div className="border-b border-border bg-muted/40">
        <Container className="py-8">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <span className="border-l-4 border-primary pl-3">Browse by Category</span>
          </h2>
          <CategoryCards categories={PROCUREMENT_CATEGORIES} />
        </Container>
      </div>

      {/* Full listing — same-page filters; the Upcoming card above sets the same `upcoming` param */}
      <Container id="listing" className="scroll-mt-24 py-8">
        <header className="mb-6">
          <h2 className="text-xl font-bold text-foreground">All Procurement Updates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse all procurement updates or filter by timing, type, commodity, district and year.
          </p>
        </header>
        <div className="mb-2">
          <FilterBar
            selects={[
              { key: 'upcoming', labelKey: 'filter.timing', options: TIMING_OPTIONS },
              { key: 'procurement_update_type', labelKey: 'filter.type', options: updateTypes },
              { key: 'commodity', labelKey: 'filter.commodity', options: commodities },
              { key: 'district', labelKey: 'filter.district', options: districts },
              { key: 'year', labelKey: 'filter.year', options: yearOptions() },
            ]}
          />
        </div>
        <ResultsSummary total={list.pagination.total_items} />
        {list.items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {list.items.map((item) => (
              <ProcurementCard key={item.id} item={item} />
            ))}
          </div>
        )}
        <PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />
      </Container>
    </>
  );
}
