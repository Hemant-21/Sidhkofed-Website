/**
 * Unit tests — public dashboard service: resolves only published+active reports with their metrics,
 * 404s an unknown/non-public report key, and serves from cache when warm. Repository/cache mocked.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, cache } = vi.hoisted(() => ({
  repo: {
    listReports: vi.fn(),
    listHomepageReports: vi.fn(),
    findReportByKey: vi.fn(),
    listPublicMetrics: vi.fn(),
  },
  cache: { getJson: vi.fn(), setJson: vi.fn() },
}));

vi.mock('./dashboard.repository', () => ({ dashboardRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));

import { dashboardPublicService } from './dashboard.public.service';
import { NotFoundError } from '@/shared/errors';

function makeReport(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'r-1',
    reportKey: 'training_summary',
    titleEn: 'Training Summary',
    titleHi: null,
    descriptionEn: null,
    descriptionHi: null,
    layoutConfig: { layout: 'fixed' },
    displayOrder: 2,
    highlightType: null,
    ...over,
  };
}

function makeMetric(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    metricKey: 'total',
    labelEn: 'Total',
    labelHi: null,
    value: { toString: () => '42' },
    valueText: null,
    unit: null,
    financialYear: null,
    reportingPeriod: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  cache.getJson.mockResolvedValue(null);
});

describe('dashboardPublicService.reportByKey', () => {
  it('404s an unknown or non-public report key', async () => {
    repo.findReportByKey.mockResolvedValue(null);
    await expect(dashboardPublicService.reportByKey('nope', {})).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns the report with resolved metrics and caches it', async () => {
    repo.findReportByKey.mockResolvedValue(makeReport());
    repo.listPublicMetrics.mockResolvedValue([makeMetric()]);
    const dto = await dashboardPublicService.reportByKey('training_summary', {});
    expect(dto.report_key).toBe('training_summary');
    expect(dto.metrics).toHaveLength(1);
    expect(dto.metrics[0].value).toBe(42);
    expect(cache.setJson).toHaveBeenCalled();
  });

  it('passes the financial-year filter through to metric resolution', async () => {
    repo.findReportByKey.mockResolvedValue(makeReport());
    repo.listPublicMetrics.mockResolvedValue([]);
    await dashboardPublicService.reportByKey('training_summary', { financialYear: 'fy-1' });
    expect(repo.listPublicMetrics).toHaveBeenCalledWith('r-1', 'fy-1', null);
  });

  it('serves from cache without hitting the repository', async () => {
    cache.getJson.mockResolvedValue({ report_key: 'training_summary', metrics: [] });
    const dto = await dashboardPublicService.reportByKey('training_summary', {});
    expect(dto.report_key).toBe('training_summary');
    expect(repo.findReportByKey).not.toHaveBeenCalled();
  });
});

describe('dashboardPublicService.dashboard', () => {
  it('resolves metrics for every active public report', async () => {
    repo.listReports.mockResolvedValue({ rows: [makeReport(), makeReport({ id: 'r-2', reportKey: 'procurement_summary' })], total: 2 });
    repo.listPublicMetrics.mockResolvedValue([makeMetric()]);
    const result = await dashboardPublicService.dashboard({});
    expect(result.reports).toHaveLength(2);
    expect(repo.listPublicMetrics).toHaveBeenCalledTimes(2);
  });
});
