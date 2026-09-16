/**
 * Unit tests — Report Publications service. The repository, cache service, audit service, and the
 * Reports service (report calculation) are all mocked. Covers the load-bearing safety mechanism:
 * preview→publish never recalculates, is rejected across FYs, is single-use, and is rejected if
 * the calculation version moved on since the preview was generated.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = vi.hoisted(() => ({
  findFinancialYearById: vi.fn(),
  findFinancialYearWithCurrentPublication: vi.fn(),
  listPublicationHistory: vi.fn(),
  findPublicationById: vi.fn(),
  findCurrentPublicationByFinancialYearId: vi.fn(),
  findCurrentPublicationByFinancialYearLabel: vi.fn(),
  listPublishedFinancialYears: vi.fn(),
  listAllFinancialYears: vi.fn(),
  createPublicationAndRepoint: vi.fn(),
}));

const cache = vi.hoisted(() => ({
  getJson: vi.fn(),
  setJson: vi.fn(),
  del: vi.fn(),
  delByPrefix: vi.fn(),
}));

const audit = vi.hoisted(() => ({
  record: vi.fn(),
  log: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  archive: vi.fn(),
  restore: vi.fn(),
}));

const reportsServiceMock = vi.hoisted(() => ({
  generateProgrammeReport: vi.fn(),
  generateDistrictReport: vi.fn(),
  generateCommodityReport: vi.fn(),
}));

vi.mock('./publications.repository', () => ({ publicationsRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('../reports.service', () => ({ reportsService: reportsServiceMock }));

import { publicationsService } from './publications.service';

const CTX = { userId: 'user-1' };

const FY = {
  id: 'fy-1',
  label: '2025-2026',
  startDate: new Date('2025-04-01'),
  endDate: new Date('2026-03-31'),
};

function makeReport(reportKey: string) {
  return {
    reportKey,
    scope: 'cms_operational',
    financialYear: { id: FY.id, label: FY.label, startDate: '2025-04-01', endDate: '2026-03-31', isCurrent: false },
    appliedFilters: {
      financialYearId: FY.id,
      financialYearLabel: FY.label,
      programmeIds: [],
      districtIds: [],
      blockIds: [],
      eventTypeIds: [],
      commodityIds: [],
      includeUnassignedProgramme: false,
    },
    rows: [],
    chart: { measure: 'completed_events', unit: 'events', data: [], allUnavailable: false },
    calculationVersion: 1,
    generatedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.findFinancialYearById.mockResolvedValue(FY);
  reportsServiceMock.generateProgrammeReport.mockResolvedValue(makeReport('programme_report'));
  reportsServiceMock.generateDistrictReport.mockResolvedValue(makeReport('district_activity_coverage'));
  reportsServiceMock.generateCommodityReport.mockResolvedValue(makeReport('commodity_report'));
});

describe('publicationsService.generatePreview', () => {
  it('computes all three reports with no filters (full FY) and caches under a fresh token', async () => {
    const result = await publicationsService.generatePreview(FY.id);
    expect(reportsServiceMock.generateProgrammeReport).toHaveBeenCalledWith({ financialYearId: FY.id });
    expect(reportsServiceMock.generateDistrictReport).toHaveBeenCalledWith({ financialYearId: FY.id });
    expect(reportsServiceMock.generateCommodityReport).toHaveBeenCalledWith({ financialYearId: FY.id });
    expect(result.previewToken).toBeTruthy();
    expect(cache.setJson).toHaveBeenCalledOnce();
  });

  it('tags every computed report as public_preview scope', async () => {
    const result = await publicationsService.generatePreview(FY.id);
    expect(result.programmeReport.scope).toBe('public_preview');
    expect(result.districtReport.scope).toBe('public_preview');
    expect(result.commodityReport.scope).toBe('public_preview');
  });
});

describe('publicationsService.publish', () => {
  const payload = {
    financialYearId: FY.id,
    calculationVersion: 1,
    fyStartDate: '2025-04-01',
    fyEndDate: '2026-03-31',
    generatedAt: new Date().toISOString(),
    programmeReport: makeReport('programme_report'),
    districtReport: makeReport('district_activity_coverage'),
    commodityReport: makeReport('commodity_report'),
  };

  it('rejects when the preview token is missing/expired', async () => {
    cache.getJson.mockResolvedValue(null);
    await expect(publicationsService.publish(FY.id, 'missing-token', CTX)).rejects.toThrow(/invalid or has expired/);
    expect(repo.createPublicationAndRepoint).not.toHaveBeenCalled();
  });

  it('rejects when the token belongs to a different financial year', async () => {
    cache.getJson.mockResolvedValue({ ...payload, financialYearId: 'other-fy' });
    await expect(publicationsService.publish(FY.id, 'tok', CTX)).rejects.toThrow(/does not belong to this financial year/);
    expect(repo.createPublicationAndRepoint).not.toHaveBeenCalled();
  });

  it('rejects when the calculation version moved on since the preview was generated', async () => {
    cache.getJson.mockResolvedValue({ ...payload, calculationVersion: 999 });
    await expect(publicationsService.publish(FY.id, 'tok', CTX)).rejects.toThrow(/calculation logic changed/);
    expect(repo.createPublicationAndRepoint).not.toHaveBeenCalled();
  });

  it('never recalculates on publish — writes exactly the cached preview payload', async () => {
    cache.getJson.mockResolvedValue(payload);
    repo.createPublicationAndRepoint.mockResolvedValue({ id: 'pub-1' });

    await publicationsService.publish(FY.id, 'tok', CTX);

    expect(reportsServiceMock.generateProgrammeReport).not.toHaveBeenCalled();
    expect(reportsServiceMock.generateDistrictReport).not.toHaveBeenCalled();
    expect(reportsServiceMock.generateCommodityReport).not.toHaveBeenCalled();
    expect(repo.createPublicationAndRepoint).toHaveBeenCalledWith(
      expect.objectContaining({ financialYearId: FY.id, calculationVersion: 1 }),
    );
  });

  it('consumes the token (single-use) before creating the publication', async () => {
    cache.getJson.mockResolvedValue(payload);
    repo.createPublicationAndRepoint.mockResolvedValue({ id: 'pub-1' });

    await publicationsService.publish(FY.id, 'tok', CTX);

    expect(cache.del).toHaveBeenCalledOnce();
  });

  it('records an audit publish event', async () => {
    cache.getJson.mockResolvedValue(payload);
    repo.createPublicationAndRepoint.mockResolvedValue({ id: 'pub-1' });

    await publicationsService.publish(FY.id, 'tok', CTX);

    expect(audit.publish).toHaveBeenCalledWith(CTX, 'report_publication', 'pub-1', expect.anything());
  });
});
