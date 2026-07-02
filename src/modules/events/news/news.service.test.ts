/**
 * Unit tests — news service duplicate-publication prevention (Issue 3). An event may be published
 * as news at most once: the service rejects a known duplicate early, and a concurrent insert that
 * trips the unique event_id constraint (Prisma P2002) is mapped to the same 409 ConflictError.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, events, media, usage, audit, cache } = vi.hoisted(() => ({
  repo: {
    slugExists: vi.fn(), existsForEvent: vi.fn(), create: vi.fn(), findById: vi.fn(),
    findBySlug: vi.fn(), update: vi.fn(), list: vi.fn(), transaction: vi.fn(),
  },
  events: { getById: vi.fn() },
  media: { getById: vi.fn() },
  usage: { registerUsage: vi.fn(), removeUsage: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
}));

vi.mock('./news.repository', () => ({ newsRepository: repo }));
vi.mock('../events.service', () => ({ eventService: events }));
vi.mock('@/modules/media/media.service', () => ({ mediaService: media }));
vi.mock('@/modules/media/media-usage.service', () => ({ mediaUsageService: usage }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));

import { newsService } from './news.service';
import { ConflictError } from '@/shared/errors';

const COMPLETED_EVENT = {
  id: 'e1', title_en: 'Event', title_hi: null, summary_en: null, summary_hi: null,
  description_en: null, description_hi: null, event_status: 'completed', cover_media: null,
};
const CTX = { userId: 'u1' };

beforeEach(() => {
  vi.clearAllMocks();
  events.getById.mockResolvedValue(COMPLETED_EVENT);
  repo.slugExists.mockResolvedValue(false);
  repo.existsForEvent.mockResolvedValue(false);
  repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
});

describe('newsService.publishFromEvent — duplicate prevention', () => {
  it('rejects when the event already has news (service-level guard)', async () => {
    repo.existsForEvent.mockResolvedValue(true);
    await expect(newsService.publishFromEvent('e1', {}, CTX)).rejects.toBeInstanceOf(ConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('maps a concurrent unique-constraint violation (P2002 on event_id) to 409', async () => {
    repo.existsForEvent.mockResolvedValue(false);
    repo.transaction.mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['event_id'] } }),
    );
    await expect(newsService.publishFromEvent('e1', {}, CTX)).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejects publishing a non-completed event', async () => {
    events.getById.mockResolvedValue({ ...COMPLETED_EVENT, event_status: 'ongoing' });
    await expect(newsService.publishFromEvent('e1', {}, CTX)).rejects.toBeInstanceOf(ConflictError);
    expect(repo.existsForEvent).not.toHaveBeenCalled();
  });

  it('does NOT swallow an unrelated error as a conflict', async () => {
    repo.transaction.mockRejectedValue(new Error('database is down'));
    await expect(newsService.publishFromEvent('e1', {}, CTX)).rejects.toThrow('database is down');
  });

  it('creates news for a completed event with no existing news', async () => {
    repo.create.mockResolvedValue({ id: 'n1', slug: 'event', titleEn: 'Event' });
    repo.findById.mockResolvedValue({
      id: 'n1', slug: 'event', titleEn: 'Event', titleHi: null, summaryEn: null, summaryHi: null,
      bodyEn: null, bodyHi: null, coverMediaId: null, coverMedia: null, newsPublishedAt: null,
      publicationState: 'draft', publicVisibility: true, publishStartAt: null, publishedAt: null,
      archivedAt: null, highlightType: null, highlightStartAt: null, highlightEndAt: null,
      displayOrder: null, showOnHomepage: false, createdById: 'u1', updatedById: 'u1',
      createdAt: new Date(), updatedAt: new Date(), eventId: 'e1',
      event: { id: 'e1', slug: 'event', titleEn: 'Event', titleHi: null, eventStatus: 'completed', eventType: { id: 't', slug: 't', nameEn: 'T', nameHi: null } },
    });
    await newsService.publishFromEvent('e1', {}, CTX);
    expect(repo.create).toHaveBeenCalledOnce();
    expect(audit.create).toHaveBeenCalled();
  });
});
