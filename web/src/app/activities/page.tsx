import type { Metadata } from 'next';
import { GraduationCap, Megaphone, Users2, Trophy } from 'lucide-react';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { EventSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions, yearOptions, enumOptions } from '@/lib/listing';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { CategoryCards, type CategoryCardDef } from '@/components/listing/category-cards';
import { LocalizedHero } from '@/components/listing/localized-heading';
import { EmptyState } from '@/components/feedback/states';
import { EventCard } from '@/components/cards/event-card';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Activities',
  description: 'Trainings, workshops, field visits, meetings and institutional activities across Jharkhand.',
  path: '/activities',
});

type SP = Record<string, string | string[] | undefined>;

/**
 * Browse-by-category shortcuts. The first three deep-link into the same-page listing below via
 * the `event_type` query param the `FilterBar`/`Select` already reads (same pattern
 * `/publications` uses for `knowledge_category`) — clicking a card and picking the same value
 * in the filter dropdown are indistinguishable, since both just set the same URL param.
 *
 * Success Stories has no backing data in the Events API (no matching EventType — see
 * masters.ts → EVENT_TYPES), so it can't be a same-page `event_type` filter value; it links to
 * its existing dedicated page instead, which already has an honest "coming soon" state.
 */
const ICON_CLASS = 'h-5 w-5 text-primary';

const ACTIVITY_CATEGORIES: CategoryCardDef[] = [
  {
    icon: <GraduationCap className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.activities.trainings.title',
    descriptionKey: 'page.activities.trainings.subtitle',
    href: '/activities?event_type=training#listing',
  },
  {
    icon: <Megaphone className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.activities.workshops.title',
    descriptionKey: 'page.activities.workshops.subtitle',
    href: '/activities?event_type=workshop#listing',
  },
  {
    icon: <Users2 className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.activities.institutional.title',
    descriptionKey: 'page.activities.institutional.subtitle',
    href: '/activities?event_type=meeting#listing',
  },
  {
    icon: <Trophy className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.activities.success.title',
    descriptionKey: 'page.activities.success.subtitle',
    href: '/activities/success-stories',
  },
];

export default async function ActivitiesPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, eventTypes, districts] = await Promise.all([
    getListSafe<EventSummary>(PUBLIC_ENDPOINTS.events, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        event_type: qstr(searchParams.event_type),
        event_status: qstr(searchParams.event_status),
        district: qstr(searchParams.district),
        year: qstr(searchParams.year),
        ordering: '-start_date',
      },
    }),
    getMasterOptions('event-types'),
    getMasterOptions('districts'),
  ]);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Activities' }]} />

      {/* Page header — same band style as /publications */}
      <LocalizedHero titleKey="page.activities.title" subtitleKey="page.activities.subtitle" />

      {/* Browse by Category */}
      <div className="border-b border-border bg-muted/40">
        <Container className="py-8">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <span className="border-l-4 border-primary pl-3">Browse by Category</span>
          </h2>
          <CategoryCards categories={ACTIVITY_CATEGORIES} />
        </Container>
      </div>

      {/* Full listing — same-page filters; category cards above set the same event_type param */}
      <Container id="listing" className="scroll-mt-24 py-8">
        <header className="mb-6">
          <h2 className="text-xl font-bold text-foreground">All Activities</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse all activities or filter by category, status, district and year.
          </p>
        </header>
        <div className="mb-2">
          <FilterBar
            selects={[
              { key: 'event_type', labelKey: 'filter.type', options: eventTypes },
              {
                key: 'event_status',
                labelKey: 'filter.status',
                options: enumOptions(['scheduled', 'ongoing', 'completed', 'postponed', 'cancelled']),
              },
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
