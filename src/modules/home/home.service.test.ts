/**
 * Unit tests — public homepage aggregate (Phase 17.2 API contract remediation, Finding 1).
 * Proves the endpoint COMPOSES the existing per-module public services (no direct Prisma),
 * curates every section by `show_on_homepage`, caps featured videos at 3, and omits the
 * Phase-2 success-stories section.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const services = vi.hoisted(() => ({
  events: { publicList: vi.fn() },
  news: { publicList: vi.fn() },
  comms: { publicList: vi.fn() },
  tenders: { publicList: vi.fn() },
  programmes: { publicList: vi.fn() },
  institutions: { publicList: vi.fn() },
  digital: { publicList: vi.fn() },
  videos: { publicList: vi.fn() },
  dashboard: { kpis: vi.fn() },
}));

vi.mock('@/modules/events/events.service', () => ({ eventService: services.events }));
vi.mock('@/modules/events/news/news.service', () => ({ newsService: services.news }));
vi.mock('@/modules/official-communications/official-communications.service', () => ({ officialCommunicationService: services.comms }));
vi.mock('@/modules/tenders/tenders.service', () => ({ tenderService: services.tenders }));
vi.mock('@/modules/programmes/programmes.service', () => ({ programmeService: services.programmes }));
vi.mock('@/modules/institutions/institutions.service', () => ({ institutionService: services.institutions }));
vi.mock('@/modules/digital-services/digital-services.service', () => ({ digitalServiceService: services.digital }));
vi.mock('@/modules/videos/video.service', () => ({ videoService: services.videos }));
vi.mock('@/modules/dashboard/dashboard.public.service', () => ({ dashboardPublicService: services.dashboard }));

import { homeService } from './home.service';

beforeEach(() => {
  vi.clearAllMocks();
  for (const s of [services.events, services.news, services.comms, services.tenders, services.programmes, services.institutions, services.digital, services.videos]) {
    s.publicList.mockResolvedValue({ items: [], total: 0 });
  }
  services.dashboard.kpis.mockResolvedValue({ kpis: [] });
});

describe('home aggregate', () => {
  it('composes every curated section and surfaces no success-stories key', async () => {
    services.news.publicList.mockResolvedValue({ items: [{ id: 'n1' }], total: 1 });
    services.videos.publicList.mockResolvedValue({ items: [{ id: 'v1' }], total: 1 });
    services.dashboard.kpis.mockResolvedValue({ kpis: [{ report_key: 'training' }] });

    const out = await homeService.aggregate();

    expect(Object.keys(out).sort()).toEqual(
      ['communications', 'digital_services', 'events', 'kpis', 'news', 'partners', 'programmes', 'tenders', 'videos'].sort(),
    );
    expect(out.news).toEqual([{ id: 'n1' }]);
    expect(out.videos).toEqual([{ id: 'v1' }]);
    expect(out.kpis).toEqual([{ report_key: 'training' }]);
    expect(out).not.toHaveProperty('success_stories');
  });

  it('curates each section by show_on_homepage and caps featured videos at 3', async () => {
    await homeService.aggregate();
    for (const s of [services.events, services.news, services.comms, services.tenders, services.programmes, services.institutions, services.digital, services.videos]) {
      const [filters] = s.publicList.mock.calls[0];
      expect(filters).toMatchObject({ showOnHomepage: true });
    }
    const [, , videoPage] = services.videos.publicList.mock.calls[0];
    expect(videoPage).toMatchObject({ take: 3 });
  });
});
