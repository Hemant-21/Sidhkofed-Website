/**
 * Unit test — public distribution-summary aggregation assembly (Issue 11). The repository is
 * mocked to return DB-computed group aggregates; the service must assemble the unchanged public
 * shape (breakdown, participants, events_count, per-item totals, grand total) without loading the
 * full distribution history.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const repo = vi.hoisted(() => ({
  aggregateSummaryModels: vi.fn(),
  aggregateItemTotals: vi.fn(),
  itemMetadata: vi.fn(),
}));

vi.mock('./toolkit-distributions.repository', () => ({ distributionRepository: repo }));

import { toolkitDistributionService } from './toolkit-distributions.service';

const TOOLKIT = { id: 't1', slug: 'kit', titleEn: 'Kit', titleHi: null };

beforeEach(() => {
  repo.aggregateSummaryModels.mockReset();
  repo.aggregateItemTotals.mockReset();
  repo.itemMetadata.mockReset();
});

describe('aggregateForToolkit', () => {
  it('assembles breakdown, participants, events_count and per-item totals from DB aggregates', async () => {
    repo.aggregateSummaryModels.mockResolvedValue([
      { distributionModel: 'individual', summaryCount: 2, participantsCovered: 30 },
      { distributionModel: 'group', summaryCount: 1, participantsCovered: 20 },
    ]);
    repo.aggregateItemTotals.mockResolvedValue([
      { toolkitItemId: 'i1', totalQuantity: new Prisma.Decimal(100) },
      { toolkitItemId: 'i2', totalQuantity: new Prisma.Decimal(50.5) },
    ]);
    repo.itemMetadata.mockResolvedValue([
      { id: 'i1', nameEn: 'Spade', nameHi: null, unit: 'pcs', distributionBasis: 'individual', displayOrder: 0 },
      { id: 'i2', nameEn: 'Seeds', nameHi: null, unit: 'kg', distributionBasis: 'group', displayOrder: 1 },
    ]);

    const dto = await toolkitDistributionService.aggregateForToolkit(TOOLKIT);

    expect(dto.distribution_model_breakdown).toEqual({ individual: 2, group: 1 });
    expect(dto.events_count).toBe(3);
    expect(dto.total_participants_covered).toBe(50);
    expect(dto.total_quantity).toBe(150.5);
    expect(dto.items).toEqual([
      { id: 'i1', name_en: 'Spade', name_hi: null, unit: 'pcs', distribution_basis: 'individual', total_quantity: 100 },
      { id: 'i2', name_en: 'Seeds', name_hi: null, unit: 'kg', distribution_basis: 'group', total_quantity: 50.5 },
    ]);
  });

  it('returns zeroes / empty items when the toolkit has no published distributions', async () => {
    repo.aggregateSummaryModels.mockResolvedValue([]);
    repo.aggregateItemTotals.mockResolvedValue([]);
    repo.itemMetadata.mockResolvedValue([]);

    const dto = await toolkitDistributionService.aggregateForToolkit(TOOLKIT);

    expect(dto.events_count).toBe(0);
    expect(dto.total_participants_covered).toBe(0);
    expect(dto.total_quantity).toBe(0);
    expect(dto.items).toEqual([]);
    expect(dto.distribution_model_breakdown).toEqual({});
    // The expensive full-history loader must NOT be used.
    expect((repo as Record<string, unknown>).publishedSummariesForToolkit).toBeUndefined();
  });
});
