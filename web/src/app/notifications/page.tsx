import type { Metadata } from 'next';
import { Bell, FileStack, Megaphone, Gavel } from 'lucide-react';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { CommunicationSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions, yearOptions } from '@/lib/listing';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { CategoryCards, type CategoryCardDef } from '@/components/listing/category-cards';
import { LocalizedHero } from '@/components/listing/localized-heading';
import { EmptyState } from '@/components/feedback/states';
import { CommunicationCard } from '@/components/cards/communication-card';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Notifications',
  description: 'Notices and tenders from SIDHKOFED, Government of Jharkhand.',
  path: '/notifications',
});

type SP = Record<string, string | string[] | undefined>;

const ICON_CLASS = 'h-5 w-5 text-primary';

/**
 * Browse-by-category shortcuts. Notices and Tenders are separate backend content types
 * (different endpoints/DTOs — official-communications vs tenders), so they can't share one
 * same-page filtered listing the way Activities' event_type did. Notices is instead the
 * *default* content of /notifications itself (same reasoning as excluding "Activities
 * Overview"/"Procurement Announcements": the base page is already that view), so the first
 * three cards are curated `communication_type` values (out of 6 real master values — Office
 * Order, Notification, Advisory are dropdown-only, same curation pattern as Procurement's
 * Rate/Centre-Update cards) that deep-link into the same-page listing below. Tenders has its
 * own dedicated listing/filters and stays a separate page — same treatment as Buyer/Seller/
 * Storage Enquiry (Procurement) and Success Stories (Activities).
 */
const NOTIFICATION_CATEGORIES: CategoryCardDef[] = [
  {
    icon: <Bell className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.notifications.category.notice.title',
    descriptionKey: 'page.notifications.category.notice.subtitle',
    href: '/notifications?communication_type=notice#listing',
  },
  {
    icon: <FileStack className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.notifications.category.circular.title',
    descriptionKey: 'page.notifications.category.circular.subtitle',
    href: '/notifications?communication_type=circular#listing',
  },
  {
    icon: <Megaphone className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.notifications.category.publicAnnouncement.title',
    descriptionKey: 'page.notifications.category.publicAnnouncement.subtitle',
    href: '/notifications?communication_type=public-announcement#listing',
  },
  {
    icon: <Gavel className={ICON_CLASS} aria-hidden="true" />,
    titleKey: 'page.notifications.tenders.title',
    descriptionKey: 'page.notifications.tenders.subtitle',
    href: '/notifications/tenders',
  },
];

export default async function NotificationsPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, communicationTypes] = await Promise.all([
    getListSafe<CommunicationSummary>(PUBLIC_ENDPOINTS.communications, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        communication_type: qstr(searchParams.communication_type),
        year: qstr(searchParams.year),
        ordering: '-issue_date',
      },
    }),
    getMasterOptions('communication-types'),
  ]);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Notifications' }]} />

      {/* Page header — same band style as /publications */}
      <LocalizedHero titleKey="page.notifications.title" subtitleKey="page.notifications.subtitle" />

      {/* Browse by Category */}
      <div className="border-b border-border bg-muted/40">
        <Container className="py-8">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <span className="border-l-4 border-primary pl-3">Browse by Category</span>
          </h2>
          <CategoryCards categories={NOTIFICATION_CATEGORIES} />
        </Container>
      </div>

      {/* Full listing (Notices) — same-page filters; the category cards above set the same
          communication_type param */}
      <Container id="listing" className="scroll-mt-24 py-8">
        <header className="mb-6">
          <h2 className="text-xl font-bold text-foreground">All Notices</h2>
          <p className="mt-1 text-sm text-muted-foreground">Browse all notices or filter by type and year.</p>
        </header>
        <div className="mb-2">
          <FilterBar
            selects={[
              { key: 'communication_type', labelKey: 'filter.type', options: communicationTypes },
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
              <CommunicationCard key={item.id} item={item} />
            ))}
          </div>
        )}
        <PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />
      </Container>
    </>
  );
}
