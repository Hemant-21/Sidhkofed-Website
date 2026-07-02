import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { EventSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions, yearOptions, enumOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { EventCard } from '@/components/cards/event-card';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Events',
  description: 'Trainings, workshops, meetings and institutional activities across Jharkhand.',
  path: '/events',
});

type SP = Record<string, string | string[] | undefined>;

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, eventTypes, districts, commodities] = await Promise.all([
    getListSafe<EventSummary>(PUBLIC_ENDPOINTS.events, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        event_type: qstr(searchParams.event_type),
        event_status: qstr(searchParams.event_status),
        district: qstr(searchParams.district),
        commodity: qstr(searchParams.commodity),
        year: qstr(searchParams.year),
        ordering: '-start_date',
      },
    }),
    getMasterOptions('event-types'),
    getMasterOptions('districts'),
    getMasterOptions('commodities'),
  ]);

  return (
    <ListingLayout
      titleKey="page.events.title"
      subtitleKey="page.events.subtitle"
      crumb="Events"
      filters={
        <FilterBar
          selects={[
            { key: 'event_type', labelKey: 'filter.type', options: eventTypes },
            {
              key: 'event_status',
              labelKey: 'filter.status',
              options: enumOptions(['scheduled', 'ongoing', 'completed', 'postponed', 'cancelled']),
            },
            { key: 'district', labelKey: 'filter.district', options: districts },
            { key: 'commodity', labelKey: 'filter.commodity', options: commodities },
            { key: 'year', labelKey: 'filter.year', options: yearOptions() },
          ]}
        />
      }
      summary={<ResultsSummary total={list.pagination.total_items} />}
      pagination={<PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />}
    >
      {list.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </ListingLayout>
  );
}
