/**
 * Unit tests — toolkit distribution is a training-level summary and may attach ONLY to a Training
 * event (CMS requirements §4.1/§4.3). The parent event-type is matched by its canonical slug
 * `training` (no hardcoded UUID); any other type is rejected with 409 Conflict on both create and
 * update. Dependencies are mocked so the rule is exercised in isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictError } from '@/shared/errors';

const events = vi.hoisted(() => ({ getById: vi.fn() }));
const toolkits = vi.hoisted(() => ({ assertLinkable: vi.fn() }));
const items = vi.hoisted(() => ({ activeItemIds: vi.fn() }));
const guard = vi.hoisted(() => ({ assertEditableByActor: vi.fn() }));
const audit = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
const cache = vi.hoisted(() => ({ delByPrefix: vi.fn() }));
const repo = vi.hoisted(() => ({
  existsForEventToolkit: vi.fn(),
  transaction: vi.fn(),
  createSummary: vi.fn(),
  updateSummary: vi.fn(),
  replaceItems: vi.fn(),
  findById: vi.fn(),
  findByIdForEvent: vi.fn(),
}));

vi.mock('../events.service', () => ({ eventService: events }));
vi.mock('@/modules/toolkits/toolkits.service', () => ({ toolkitService: toolkits }));
vi.mock('@/modules/toolkits/items/items.service', () => ({ toolkitItemService: items }));
vi.mock('@/shared/content-guard', () => ({ assertEditableByActor: guard.assertEditableByActor }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('./toolkit-distributions.repository', () => ({ distributionRepository: repo }));

import { toolkitDistributionService } from './toolkit-distributions.service';

const EVENT_ID = '11111111-1111-1111-8111-111111111111';
const DIST_ID = '22222222-2222-2222-8222-222222222222';
const TOOLKIT_ID = '33333333-3333-3333-8333-333333333333';
const CTX = { userId: '44444444-4444-4444-8444-444444444444', authz: { roleKeys: [], permissions: new Set<string>() } } as never;

const eventWithType = (slug: string): Record<string, unknown> => ({
  id: EVENT_ID,
  publication_state: 'draft',
  event_type: { id: 'et', slug, name_en: slug, name_hi: null },
});

const fullRow = {
  id: DIST_ID,
  eventId: EVENT_ID,
  toolkitId: TOOLKIT_ID,
  toolkit: { id: TOOLKIT_ID, slug: 'kit', titleEn: 'Kit', titleHi: null },
  distributionDone: false,
  distributionModel: 'individual',
  participantsCovered: null,
  distributionDate: null,
  remarksEn: null,
  remarksHi: null,
  items: [],
  createdById: CTX.userId,
  updatedById: CTX.userId,
  createdAt: new Date('2026-06-25T00:00:00Z'),
  updatedAt: new Date('2026-06-25T00:00:00Z'),
};

const createInput = { toolkit_id: TOOLKIT_ID, distribution_model: 'individual' as const };

beforeEach(() => {
  vi.clearAllMocks();
  guard.assertEditableByActor.mockReturnValue(undefined);
  toolkits.assertLinkable.mockResolvedValue(undefined);
  audit.create.mockResolvedValue(undefined);
  audit.update.mockResolvedValue(undefined);
  cache.delByPrefix.mockResolvedValue(undefined);
  repo.existsForEventToolkit.mockResolvedValue(false);
  repo.createSummary.mockResolvedValue({ id: DIST_ID });
  repo.updateSummary.mockResolvedValue(undefined);
  repo.replaceItems.mockResolvedValue(undefined);
  repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
  repo.findById.mockResolvedValue(fullRow);
  repo.findByIdForEvent.mockResolvedValue(fullRow);
});

describe('toolkit distribution — training-only parent rule (create)', () => {
  it('allows a Training event (success)', async () => {
    events.getById.mockResolvedValue(eventWithType('training'));
    const dto = await toolkitDistributionService.create(EVENT_ID, createInput, CTX);
    expect(dto.id).toBe(DIST_ID);
    expect(repo.createSummary).toHaveBeenCalledOnce();
  });

  it.each(['meeting', 'conference', 'mou-signing', 'awareness-programme', 'other-institutional-activity'])(
    'rejects a non-training event type (%s) with 409 Conflict',
    async (slug) => {
      events.getById.mockResolvedValue(eventWithType(slug));
      await expect(toolkitDistributionService.create(EVENT_ID, createInput, CTX)).rejects.toBeInstanceOf(ConflictError);
      // The business rule fires before any write.
      expect(repo.existsForEventToolkit).not.toHaveBeenCalled();
      expect(repo.createSummary).not.toHaveBeenCalled();
    },
  );

  it('returns the conflict error code/status', async () => {
    events.getById.mockResolvedValue(eventWithType('meeting'));
    await expect(toolkitDistributionService.create(EVENT_ID, createInput, CTX)).rejects.toMatchObject({
      code: 'conflict',
      statusCode: 409,
    });
  });
});

describe('toolkit distribution — training-only parent rule (update)', () => {
  it('allows updating a distribution on a Training event', async () => {
    events.getById.mockResolvedValue(eventWithType('training'));
    const dto = await toolkitDistributionService.update(EVENT_ID, DIST_ID, { distribution_done: true }, CTX);
    expect(dto.id).toBe(DIST_ID);
    expect(repo.updateSummary).toHaveBeenCalledOnce();
  });

  it('rejects updating when the parent event is not a Training event', async () => {
    events.getById.mockResolvedValue(eventWithType('mou-signing'));
    await expect(
      toolkitDistributionService.update(EVENT_ID, DIST_ID, { distribution_done: true }, CTX),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.updateSummary).not.toHaveBeenCalled();
  });
});
