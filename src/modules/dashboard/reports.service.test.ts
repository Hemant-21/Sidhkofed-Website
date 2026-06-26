/**
 * Unit tests — dashboard report service: fixed-key duplicate prevention (409), create audit + cache
 * invalidation, and lifecycle transition validation. Repository/cache/audit are mocked (DB-free).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, cache, audit } = vi.hoisted(() => ({
  repo: {
    reportKeyExists: vi.fn(),
    createReport: vi.fn(),
    findReportById: vi.fn(),
    updateReport: vi.fn(),
    listReports: vi.fn(),
  },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
}));

vi.mock('./dashboard.repository', () => ({ dashboardRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));

import { reportService } from './reports.service';
import { ConflictError, NotFoundError } from '@/shared/errors';

const NOW = new Date('2026-06-26T00:00:00.000Z');

function makeReport(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'r-1',
    reportKey: 'training_summary',
    titleEn: 'Training Summary',
    titleHi: null,
    descriptionEn: null,
    descriptionHi: null,
    layoutConfig: null,
    publicationState: 'draft',
    publicVisibility: true,
    publishStartAt: null,
    publishedAt: null,
    archivedAt: null,
    highlightType: null,
    highlightStartAt: null,
    highlightEndAt: null,
    displayOrder: 2,
    showOnHomepage: false,
    isActive: true,
    createdById: 'u-1',
    updatedById: 'u-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

const ctx = { userId: 'u-1' };

beforeEach(() => {
  vi.clearAllMocks();
  repo.reportKeyExists.mockResolvedValue(false);
  repo.createReport.mockImplementation(async () => makeReport());
  repo.updateReport.mockImplementation(async (_id: string, data: Record<string, unknown>) =>
    makeReport(data),
  );
});

describe('reportService.create', () => {
  it('creates a report, audits it, and invalidates the public cache', async () => {
    await reportService.create(
      { report_key: 'training_summary', title_en: 'Training Summary' } as never,
      ctx,
    );
    expect(repo.createReport).toHaveBeenCalledTimes(1);
    expect(audit.create).toHaveBeenCalledTimes(1);
    expect(cache.delByPrefix).toHaveBeenCalled();
  });

  it('rejects a duplicate report key (409) and does not insert', async () => {
    repo.reportKeyExists.mockResolvedValue(true);
    await expect(
      reportService.create({ report_key: 'training_summary', title_en: 'X' } as never, ctx),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.createReport).not.toHaveBeenCalled();
  });
});

describe('reportService.lifecycle', () => {
  it('publishes a draft report and logs the lifecycle audit', async () => {
    repo.findReportById.mockResolvedValue(makeReport({ publicationState: 'draft' }));
    await reportService.lifecycle('r-1', 'publish', ctx);
    expect(audit.log).toHaveBeenCalledWith(
      'PUBLISH',
      expect.anything(),
      expect.objectContaining({ module: 'dashboard_report', newState: 'published' }),
    );
  });

  it('rejects an invalid transition (publish an already-published report → 409)', async () => {
    repo.findReportById.mockResolvedValue(makeReport({ publicationState: 'published' }));
    await expect(reportService.lifecycle('r-1', 'publish', ctx)).rejects.toBeInstanceOf(ConflictError);
  });

  it('404s lifecycle on a missing report', async () => {
    repo.findReportById.mockResolvedValue(null);
    await expect(reportService.lifecycle('missing', 'archive', ctx)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
