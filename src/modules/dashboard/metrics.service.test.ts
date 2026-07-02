/**
 * Unit tests — dashboard metric service: parent-report existence, reference/master-activation
 * validation, the unique (report, key, FY, period) constraint (409), the effective exactly-one-value
 * rule on PATCH, and delete. Repository/cache/audit are mocked (DB-free).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, cache, audit } = vi.hoisted(() => ({
  repo: {
    findReportById: vi.fn(),
    validateReferences: vi.fn(),
    findMetricByUniqueKey: vi.fn(),
    createMetric: vi.fn(),
    findMetricById: vi.fn(),
    updateMetric: vi.fn(),
    deleteMetric: vi.fn(),
    listMetricsByReport: vi.fn(),
  },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('./dashboard.repository', () => ({ dashboardRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));

import { metricService } from './metrics.service';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';

const REPORT = 'r-1';
const FY = '11111111-1111-4111-8111-111111111111';

function makeMetric(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'm-1',
    reportId: REPORT,
    metricKey: 'total',
    labelEn: 'Total',
    labelHi: null,
    value: { toString: () => '42' },
    valueText: null,
    unit: null,
    financialYearId: null,
    reportingPeriodId: null,
    financialYear: null,
    reportingPeriod: null,
    source: 'manual',
    datasetId: null,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

const ctx = { userId: 'u-1' };
const baseCreate = { metric_key: 'total', label_en: 'Total', value: 42 };

beforeEach(() => {
  vi.clearAllMocks();
  repo.findReportById.mockResolvedValue({ id: REPORT });
  repo.validateReferences.mockResolvedValue({});
  repo.findMetricByUniqueKey.mockResolvedValue(null);
  repo.createMetric.mockImplementation(async () => makeMetric());
  repo.updateMetric.mockImplementation(async () => makeMetric());
});

describe('metricService.create', () => {
  it('404s when the parent report does not exist', async () => {
    repo.findReportById.mockResolvedValue(null);
    await expect(metricService.create(REPORT, baseCreate as never, ctx)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('rejects an inactive financial-year reference (422)', async () => {
    repo.validateReferences.mockResolvedValue({ financial_year_id: ['Financial year is inactive.'] });
    await expect(
      metricService.create(REPORT, { ...baseCreate, financial_year_id: FY } as never, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.createMetric).not.toHaveBeenCalled();
  });

  it('rejects a duplicate metric on the unique key (409)', async () => {
    repo.findMetricByUniqueKey.mockResolvedValue({ id: 'existing' });
    await expect(metricService.create(REPORT, baseCreate as never, ctx)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(repo.createMetric).not.toHaveBeenCalled();
  });

  it('creates a metric, audits it, and invalidates the cache', async () => {
    await metricService.create(REPORT, baseCreate as never, ctx);
    expect(repo.createMetric).toHaveBeenCalledTimes(1);
    expect(audit.create).toHaveBeenCalledTimes(1);
    expect(cache.delByPrefix).toHaveBeenCalled();
  });
});

describe('metricService.update — effective exactly-one-value', () => {
  it('rejects setting value_text on a metric that already has a numeric value (both present)', async () => {
    repo.findMetricById.mockResolvedValue(makeMetric({ value: { toString: () => '42' }, valueText: null }));
    await expect(
      metricService.update(REPORT, 'm-1', { value_text: 'N/A' } as never, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows swapping to value_text when the numeric value is cleared in the same PATCH', async () => {
    repo.findMetricById.mockResolvedValue(makeMetric({ value: { toString: () => '42' }, valueText: null }));
    await expect(
      metricService.update(REPORT, 'm-1', { value: null, value_text: 'N/A' } as never, ctx),
    ).resolves.toBeDefined();
  });

  it('404s when the metric belongs to a different report', async () => {
    repo.findMetricById.mockResolvedValue(makeMetric({ reportId: 'other-report' }));
    await expect(
      metricService.update(REPORT, 'm-1', { label_en: 'X' } as never, ctx),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('metricService.remove', () => {
  it('deletes the metric and writes a delete audit', async () => {
    repo.findMetricById.mockResolvedValue(makeMetric());
    await metricService.remove(REPORT, 'm-1', ctx);
    expect(repo.deleteMetric).toHaveBeenCalledWith('m-1');
    expect(audit.delete).toHaveBeenCalledTimes(1);
  });
});

// ── Issue 3: uniqueness across NULL dimensions + concurrent insert ──────────────
describe('metricService.create — NULL-dimension uniqueness (NULLS NOT DISTINCT)', () => {
  it('checks the unique slot with NULL FY/period when they are omitted', async () => {
    await metricService.create(REPORT, baseCreate as never, ctx);
    // A period-less ("cumulative") metric is matched on NULL dimensions, mirroring NULLS NOT DISTINCT.
    expect(repo.findMetricByUniqueKey).toHaveBeenCalledWith(REPORT, 'total', null, null);
  });

  it('rejects a duplicate period-less metric (existing NULL-dimension row) with 409', async () => {
    repo.findMetricByUniqueKey.mockResolvedValue({ id: 'existing-null' });
    await expect(metricService.create(REPORT, baseCreate as never, ctx)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(repo.createMetric).not.toHaveBeenCalled();
  });

  it('maps a concurrent unique violation (P2002) on insert to 409', async () => {
    repo.findMetricByUniqueKey.mockResolvedValue(null); // passes the pre-check
    repo.createMetric.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['dashboard_metrics_unique'] } }),
    );
    await expect(metricService.create(REPORT, baseCreate as never, ctx)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
