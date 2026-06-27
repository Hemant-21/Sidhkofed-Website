/**
 * Public homepage aggregate service — `GET /api/v1/public/home` (CMS requirements §15.8 "one
 * aggregated homepage endpoint" / API spec §5 Home row / master-build §10.3).
 *
 * This endpoint COMPOSES the existing per-module public services; it never re-queries Prisma
 * directly and adds no new repository logic (CMS requirements §2.1–2.4, §15.10). Every section is
 * curated through the homepage workflow flag (`show_on_homepage`) and the standard public-visibility
 * predicate already enforced inside each module's `publicList`. Because each section's cache key lives
 * under its module's `:public:` prefix, an admin write to that module invalidates the matching home
 * section automatically — no separate cross-module invalidation is needed here.
 *
 * Success Stories are intentionally OMITTED: that module is Phase 2 (CMS requirements §22 / master-
 * build §8.1 "normally Phase 2") and has no backing table in the implemented schema. The section is
 * additive and can be slotted in when the module ships, without breaking this contract.
 */
import { eventService } from '@/modules/events/events.service';
import { newsService } from '@/modules/events/news/news.service';
import { officialCommunicationService } from '@/modules/official-communications/official-communications.service';
import { tenderService } from '@/modules/tenders/tenders.service';
import { programmeService } from '@/modules/programmes/programmes.service';
import { institutionService } from '@/modules/institutions/institutions.service';
import { digitalServiceService } from '@/modules/digital-services/digital-services.service';
import { videoService } from '@/modules/videos/video.service';
import { dashboardPublicService } from '@/modules/dashboard/dashboard.public.service';

/** Per-section caps — the homepage shows a small curated slice, not full listings (API spec §15.3). */
const LIMIT = {
  news: 6,
  events: 6,
  communications: 6,
  tenders: 6,
  programmes: 8,
  partners: 24,
  digitalServices: 12,
  videos: 3, // hard cap — at most three featured videos (CMS requirements §5.3 / §12).
} as const;

/** Build the `{ skip, take, page, pageSize }` shape every module `publicList` expects. */
const firstPage = (take: number) => ({ skip: 0, take, page: 1, pageSize: take });

export interface HomeAggregate {
  kpis: Awaited<ReturnType<typeof dashboardPublicService.kpis>>['kpis'];
  news: Awaited<ReturnType<typeof newsService.publicList>>['items'];
  events: Awaited<ReturnType<typeof eventService.publicList>>['items'];
  communications: Awaited<ReturnType<typeof officialCommunicationService.publicList>>['items'];
  tenders: Awaited<ReturnType<typeof tenderService.publicList>>['items'];
  programmes: Awaited<ReturnType<typeof programmeService.publicList>>['items'];
  partners: Awaited<ReturnType<typeof institutionService.publicList>>['items'];
  digital_services: Awaited<ReturnType<typeof digitalServiceService.publicList>>['items'];
  videos: Awaited<ReturnType<typeof videoService.publicList>>['items'];
}

/**
 * Aggregate the curated homepage payload. Each section is fetched in parallel through its module's
 * public service so the visibility predicate, DTO shape, and caching stay single-sourced.
 */
export async function aggregate(): Promise<HomeAggregate> {
  const [kpis, news, events, communications, tenders, programmes, partners, digitalServices, videos] =
    await Promise.all([
      dashboardPublicService.kpis({}),
      newsService.publicList(
        { showOnHomepage: true },
        { field: 'news_published_at', direction: 'desc' },
        firstPage(LIMIT.news),
        'news:public:home',
      ),
      eventService.publicList(
        { showOnHomepage: true },
        { field: 'start_date', direction: 'desc' },
        firstPage(LIMIT.events),
        'events:public:home',
      ),
      officialCommunicationService.publicList(
        { showOnHomepage: true },
        { field: 'issue_date', direction: 'desc' },
        firstPage(LIMIT.communications),
        'official-communications:public:home',
      ),
      tenderService.publicList(
        { showOnHomepage: true },
        { field: 'publish_date', direction: 'desc' },
        firstPage(LIMIT.tenders),
        'tenders:public:home',
      ),
      programmeService.publicList(
        { showOnHomepage: true },
        { field: 'display_order', direction: 'asc' },
        firstPage(LIMIT.programmes),
        'programmes:public:home',
      ),
      institutionService.publicList(
        { showOnHomepage: true },
        { field: 'display_order', direction: 'asc' },
        firstPage(LIMIT.partners),
        'institutions:public:home',
      ),
      digitalServiceService.publicList(
        { showOnHomepage: true },
        { field: 'display_order', direction: 'asc' },
        firstPage(LIMIT.digitalServices),
        'digital-services:public:home',
      ),
      videoService.publicList(
        { showOnHomepage: true },
        { field: 'display_order', direction: 'asc' },
        firstPage(LIMIT.videos),
        'videos:public:home',
      ),
    ]);

  return {
    kpis: kpis.kpis,
    news: news.items,
    events: events.items,
    communications: communications.items,
    tenders: tenders.items,
    programmes: programmes.items,
    partners: partners.items,
    digital_services: digitalServices.items,
    videos: videos.items,
  };
}

export const homeService = { aggregate };
