/**
 * Unit tests — dashboard dataset import: validate-all-first, all-or-nothing (any invalid row rejects
 * the whole import; nothing persisted), import preview (no writes), within-batch duplicate-key
 * detection, transactional create/refresh of metrics with correct counts, and rollback when the
 * transaction throws. Repository/cache/audit are mocked (DB-free).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, cache, audit } = vi.hoisted(() => ({
  repo: {
    findReportById: vi.fn(),
    validateReferences: vi.fn(),
    transaction: vi.fn(),
    createDataset: vi.fn(),
    findMetricByUniqueKey: vi.fn(),
    createMetric: vi.fn(),
    updateMetric: vi.fn(),
    findDatasetById: vi.fn(),
  },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
  audit: { create: vi.fn() },
}));

vi.mock('./dashboard.repository', () => ({ dashboardRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));

import { datasetService, type DatasetImportResult, type DatasetPreviewResult } from './datasets.service';
import { ValidationError, NotFoundError, ConflictError } from '@/shared/errors';

const REPORT = 'r-1';
const FY = '11111111-1111-4111-8111-111111111111';
const ctx = { userId: 'u-1' };

function makeDataset(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'd-1',
    reportId: REPORT,
    source: 'manual',
    status: 'processed',
    rowCount: 0,
    financialYear: null,
    reportingPeriod: null,
    sourceFileAsset: null,
    processedAt: new Date(),
    createdById: 'u-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

function params(rows: unknown[], over: Record<string, unknown> = {}) {
  return {
    source: 'manual' as const,
    financialYearId: null,
    reportingPeriodId: null,
    sourceFileAssetId: null,
    preview: false,
    rows,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.findReportById.mockResolvedValue({ id: REPORT });
  repo.validateReferences.mockResolvedValue({});
  repo.findMetricByUniqueKey.mockResolvedValue(null);
  repo.createDataset.mockImplementation(async (data: Record<string, unknown>) =>
    makeDataset({ rowCount: data.rowCount }),
  );
  repo.findDatasetById.mockImplementation(async () => makeDataset());
  repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
});

describe('datasetService.importDataset — guards', () => {
  it('404s when the report does not exist', async () => {
    repo.findReportById.mockResolvedValue(null);
    await expect(
      datasetService.importDataset(REPORT, params([{ metric_key: 'k', label_en: 'K', value: 1 }]), ctx),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects an inactive financial-year reference before touching rows (422)', async () => {
    repo.validateReferences.mockResolvedValue({ financial_year_id: ['Financial year is inactive.'] });
    await expect(
      datasetService.importDataset(
        REPORT,
        params([{ metric_key: 'k', label_en: 'K', value: 1 }], { financialYearId: FY }),
        ctx,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.transaction).not.toHaveBeenCalled();
  });
});

describe('datasetService.importDataset — all-or-nothing', () => {
  it('rejects the entire import when any row is invalid (nothing persisted)', async () => {
    const rows = [
      { metric_key: 'a', label_en: 'A', value: 1 },
      { metric_key: 'b', label_en: 'B' }, // invalid: neither value nor value_text
    ];
    await expect(datasetService.importDataset(REPORT, params(rows), ctx)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(repo.transaction).not.toHaveBeenCalled();
    expect(repo.createDataset).not.toHaveBeenCalled();
  });

  it('rejects a within-batch duplicate metric_key', async () => {
    const rows = [
      { metric_key: 'a', label_en: 'A', value: 1 },
      { metric_key: 'a', label_en: 'A2', value: 2 },
    ];
    await expect(datasetService.importDataset(REPORT, params(rows), ctx)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(repo.transaction).not.toHaveBeenCalled();
  });
});

describe('datasetService.importDataset — preview', () => {
  it('reports validation results without persisting', async () => {
    const rows = [
      { metric_key: 'a', label_en: 'A', value: 1 },
      { metric_key: 'b', label_en: 'B' }, // invalid
    ];
    const result = (await datasetService.importDataset(
      REPORT,
      params(rows, { preview: true }),
      ctx,
    )) as DatasetPreviewResult;
    expect(result.preview).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.row_count).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(1);
    expect(repo.transaction).not.toHaveBeenCalled();
  });
});

describe('datasetService.importDataset — transactional apply', () => {
  it('creates new metrics and refreshes existing ones with correct counts', async () => {
    // 'a' is new; 'b' already exists → refreshed.
    repo.findMetricByUniqueKey.mockImplementation(async (_r: string, key: string) =>
      key === 'b' ? { id: 'existing-b' } : null,
    );
    const rows = [
      { metric_key: 'a', label_en: 'A', value: 1 },
      { metric_key: 'b', label_en: 'B', value: 2 },
    ];
    const result = (await datasetService.importDataset(REPORT, params(rows), ctx)) as DatasetImportResult;
    expect(repo.transaction).toHaveBeenCalledTimes(1);
    expect(repo.createMetric).toHaveBeenCalledTimes(1);
    expect(repo.updateMetric).toHaveBeenCalledWith('existing-b', expect.anything(), expect.anything());
    expect(result.metrics_created).toBe(1);
    expect(result.metrics_updated).toBe(1);
    expect(audit.create).toHaveBeenCalledTimes(1);
    expect(cache.delByPrefix).toHaveBeenCalled();
  });

  it('rolls back (propagates) when the transaction fails, and writes no audit', async () => {
    repo.transaction.mockRejectedValueOnce(new Error('db failure'));
    await expect(
      datasetService.importDataset(REPORT, params([{ metric_key: 'a', label_en: 'A', value: 1 }]), ctx),
    ).rejects.toThrow('db failure');
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('maps a concurrent unique violation (P2002) inside the transaction to 409', async () => {
    repo.transaction.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['dashboard_metrics_unique'] } }),
    );
    await expect(
      datasetService.importDataset(REPORT, params([{ metric_key: 'a', label_en: 'A', value: 1 }]), ctx),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
