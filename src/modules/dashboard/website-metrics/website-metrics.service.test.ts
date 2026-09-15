/**
 * Unit tests — Website Metrics service. The repository, cache service, audit service, and the
 * public-eligibility policy calculation are all mocked so these never touch Prisma or the real
 * Operational Reports repository. Covers the preview/publish safety mechanism (the load-bearing
 * part of this module) plus config validation and the lifecycle actions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = vi.hoisted(() => ({
  metricKeyExists: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  listPublishedForPlacement: vi.fn(),
  createSnapshot: vi.fn(),
  findSnapshotById: vi.fn(),
  listSnapshotsByMetric: vi.fn(),
  updateSnapshot: vi.fn(),
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

const publicPolicy = vi.hoisted(() => ({
  calculatePublicMeasure: vi.fn(),
  PUBLIC_SCOPE_POLICY_VERSION: 1,
}));

vi.mock('./website-metrics.repository', () => ({ websiteMetricsRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('./website-metrics.public-policy', () => publicPolicy);

import { websiteMetricsService } from './website-metrics.service';
import { validateCreateBody, assertMeasureConfig } from './website-metrics.validators';

const CTX = { userId: 'user-1' };

const BASE_METRIC = {
  id: 'metric-1',
  metricKey: 'homepage-total-events',
  reportKey: 'event_activity_outcomes',
  measureKey: 'total_events',
  calculationVersion: 1,
  filterConfig: {},
  periodConfig: { mode: 'fixed_range', startDate: '2025-04-01', endDate: '2025-06-30' },
  labelEn: 'Total events',
  labelHi: null,
  placementKey: 'homepage',
  displayOrder: 0,
  isEnabled: true,
  isArchived: false,
  configRevision: 1,
  currentSnapshotId: null,
  currentSnapshot: null,
  createdById: 'user-1',
  updatedById: 'user-1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

beforeEach(() => {
  Object.values(repo).forEach((fn) => fn.mockReset());
  Object.values(cache).forEach((fn) => fn.mockReset());
  Object.values(audit).forEach((fn) => fn.mockReset());
  publicPolicy.calculatePublicMeasure.mockReset();
});

describe('validators — public-eligibility gating', () => {
  it('rejects a measure that is not public-eligible, naming the measure', () => {
    try {
      assertMeasureConfig('event_activity_outcomes', 'overdue_incomplete_events', {}, { mode: 'fixed_range' });
      throw new Error('expected assertMeasureConfig to throw');
    } catch (err: unknown) {
      const fields = (err as { fields?: Record<string, string[]> }).fields;
      expect(fields?.measureKey?.[0]).toMatch(/overdue_incomplete_events.*not public-eligible/s);
    }
  });

  it('rejects an unknown report key', () => {
    expect(() => assertMeasureConfig('not_a_report', 'x', {}, { mode: 'fixed_range' })).toThrow();
  });

  it('rejects an unknown measure key on a real report', () => {
    expect(() => assertMeasureConfig('event_activity_outcomes', 'not_a_measure', {}, { mode: 'fixed_range' })).toThrow();
  });

  it('rejects a filter key not supported by the measure', () => {
    expect(() =>
      assertMeasureConfig('event_activity_outcomes', 'total_events', { commodityId: ['x'] }, { mode: 'fixed_range' }),
    ).toThrow();
  });

  it('rejects a period mode not supported by the measure', () => {
    expect(() =>
      assertMeasureConfig('event_activity_outcomes', 'total_events', {}, { mode: 'quarterly' }),
    ).toThrow();
  });

  it('accepts a valid public-eligible configuration', () => {
    const measure = assertMeasureConfig(
      'event_activity_outcomes',
      'total_events',
      { districtId: ['11111111-1111-1111-1111-111111111111'] },
      { mode: 'fixed_range' },
    );
    expect(measure.key).toBe('total_events');
  });

  it('validateCreateBody rejects a non-public-eligible measure end-to-end', () => {
    expect(() =>
      validateCreateBody({
        reportKey: 'event_activity_outcomes',
        measureKey: 'overdue_incomplete_events',
        periodConfig: { mode: 'fixed_range', startDate: '2025-04-01', endDate: '2025-06-30' },
        labelEn: 'Overdue events',
        placementKey: 'homepage',
      }),
    ).toThrow();
  });
});

describe('preview / publish safety mechanism', () => {
  it('preview() caches a token keyed to the resolved value and config revision', async () => {
    repo.findById.mockResolvedValue(BASE_METRIC);
    publicPolicy.calculatePublicMeasure.mockResolvedValue({
      value: 42,
      unit: 'events',
      noteEn: 'note',
      noteHi: undefined,
      calculationVersion: 1,
      completeness: { known: 42, missing: 0, undated: 0 },
      resolvedPeriod: { mode: 'fixed_range', start: new Date('2025-04-01'), end: new Date('2025-06-30'), basisDescription: 'x' },
      resolvedFilters: {},
      calculatedAt: new Date('2025-06-30T00:00:00Z'),
      publicScopePolicyVersion: 1,
    });

    const result = await websiteMetricsService.preview('metric-1', CTX);

    expect(result.value).toBe(42);
    expect(result.configRevision).toBe(1);
    expect(cache.setJson).toHaveBeenCalledTimes(1);
    const [key, payload, ttl] = cache.setJson.mock.calls[0];
    expect(key).toBe(`website_metrics:preview:${result.previewToken}`);
    expect(payload.value).toBe(42);
    expect(payload.metricId).toBe('metric-1');
    expect(ttl).toBe(5 * 60);
  });

  it('publish() rejects an expired/unknown preview token', async () => {
    repo.findById.mockResolvedValue(BASE_METRIC);
    cache.getJson.mockResolvedValue(null);

    await expect(websiteMetricsService.publish('metric-1', 'bad-token', CTX)).rejects.toThrow(/expired/i);
    expect(repo.createSnapshot).not.toHaveBeenCalled();
  });

  it('publish() rejects a token belonging to a different metric', async () => {
    repo.findById.mockResolvedValue(BASE_METRIC);
    cache.getJson.mockResolvedValue({ metricId: 'other-metric', configRevision: 1, value: 10 });

    await expect(websiteMetricsService.publish('metric-1', 'tok', CTX)).rejects.toThrow(/does not belong/i);
    expect(repo.createSnapshot).not.toHaveBeenCalled();
  });

  it('publish() rejects when configRevision changed since the preview was issued (edit-after-preview)', async () => {
    repo.findById.mockResolvedValue({ ...BASE_METRIC, configRevision: 2 });
    cache.getJson.mockResolvedValue({ metricId: 'metric-1', configRevision: 1, value: 10 });

    await expect(websiteMetricsService.publish('metric-1', 'tok', CTX)).rejects.toThrow(/changed after this preview/i);
    expect(repo.createSnapshot).not.toHaveBeenCalled();
  });

  it('publish() rejects a null previewed value rather than coalescing to zero', async () => {
    repo.findById.mockResolvedValue(BASE_METRIC);
    cache.getJson.mockResolvedValue({ metricId: 'metric-1', configRevision: 1, value: null });

    await expect(websiteMetricsService.publish('metric-1', 'tok', CTX)).rejects.toThrow();
    expect(repo.createSnapshot).not.toHaveBeenCalled();
  });

  it('publish() success: creates an immutable snapshot, updates currentSnapshotId, consumes the token, audits, invalidates cache', async () => {
    repo.findById.mockResolvedValue(BASE_METRIC);
    const tokenPayload = {
      metricId: 'metric-1',
      configRevision: 1,
      value: 42,
      unit: 'events',
      labelEn: 'Total events',
      labelHi: null,
      definitionNoteEn: 'note',
      definitionNoteHi: null,
      resolvedFilters: {},
      resolvedPeriod: { mode: 'fixed_range' },
      completeness: { known: 42, missing: 0, undated: 0 },
      calculatedAt: '2025-06-30T00:00:00.000Z',
      calculationVersion: 1,
      publicScopePolicyVersion: 1,
    };
    cache.getJson.mockResolvedValue(tokenPayload);
    repo.createSnapshot.mockResolvedValue({ id: 'snap-1', configRevision: 1 });
    repo.update.mockResolvedValue({ ...BASE_METRIC, currentSnapshotId: 'snap-1' });

    const dto = await websiteMetricsService.publish('metric-1', 'tok', CTX);

    expect(repo.createSnapshot).toHaveBeenCalledTimes(1);
    const createArgs = repo.createSnapshot.mock.calls[0][0];
    expect(createArgs.metricId).toBe('metric-1');
    expect(createArgs.value.toString()).toBe('42');
    expect(cache.del).toHaveBeenCalledWith('website_metrics:preview:tok');
    expect(repo.update).toHaveBeenCalledWith('metric-1', expect.objectContaining({ currentSnapshotId: 'snap-1' }));
    expect(audit.publish).toHaveBeenCalledTimes(1);
    expect(cache.delByPrefix).toHaveBeenCalledTimes(1);
    expect(dto.current_snapshot_id ?? dto.id).toBeDefined();
  });
});

describe('unpublish / archive / restore', () => {
  it('unpublish() clears currentSnapshotId but never touches snapshot rows', async () => {
    repo.findById.mockResolvedValue({ ...BASE_METRIC, currentSnapshotId: 'snap-1' });
    repo.update.mockResolvedValue({ ...BASE_METRIC, currentSnapshotId: null });

    await websiteMetricsService.unpublish('metric-1', CTX);

    expect(repo.update).toHaveBeenCalledWith('metric-1', expect.objectContaining({ currentSnapshotId: null }));
    expect(repo.createSnapshot).not.toHaveBeenCalled();
    expect(repo.updateSnapshot).not.toHaveBeenCalled();
    expect(audit.unpublish).toHaveBeenCalledTimes(1);
  });

  it('unpublish() rejects a metric that is not currently published', async () => {
    repo.findById.mockResolvedValue({ ...BASE_METRIC, currentSnapshotId: null });
    await expect(websiteMetricsService.unpublish('metric-1', CTX)).rejects.toThrow(/not currently published/i);
  });

  it('archive() sets isArchived and restore() clears it', async () => {
    repo.findById.mockResolvedValueOnce({ ...BASE_METRIC, isArchived: false });
    repo.update.mockResolvedValueOnce({ ...BASE_METRIC, isArchived: true });
    await websiteMetricsService.archive('metric-1', CTX);
    expect(repo.update).toHaveBeenCalledWith('metric-1', expect.objectContaining({ isArchived: true }));

    repo.findById.mockResolvedValueOnce({ ...BASE_METRIC, isArchived: true });
    repo.update.mockResolvedValueOnce({ ...BASE_METRIC, isArchived: false });
    await websiteMetricsService.restore('metric-1', CTX);
    expect(repo.update).toHaveBeenCalledWith('metric-1', expect.objectContaining({ isArchived: false }));
  });

  it('archive() rejects an already-archived metric', async () => {
    repo.findById.mockResolvedValue({ ...BASE_METRIC, isArchived: true });
    await expect(websiteMetricsService.archive('metric-1', CTX)).rejects.toThrow(/already archived/i);
  });
});

describe('updateConfig — revision bump + snapshot immutability', () => {
  it('bumps configRevision when filterConfig actually changes', async () => {
    repo.findById.mockResolvedValue(BASE_METRIC);
    repo.update.mockResolvedValue({ ...BASE_METRIC, configRevision: 2 });

    await websiteMetricsService.updateConfig(
      'metric-1',
      { filterConfig: { districtId: ['11111111-1111-1111-1111-111111111111'] } },
      CTX,
    );

    const data = repo.update.mock.calls[0][1];
    expect(data.configRevision).toBe(2);
  });

  it('does NOT bump configRevision for label/placement/displayOrder-only edits', async () => {
    repo.findById.mockResolvedValue(BASE_METRIC);
    repo.update.mockResolvedValue(BASE_METRIC);

    await websiteMetricsService.updateConfig('metric-1', { labelEn: 'New label', displayOrder: 3 }, CTX);

    const data = repo.update.mock.calls[0][1];
    expect(data.configRevision).toBeUndefined();
    expect(data.labelEn).toBe('New label');
    expect(data.displayOrder).toBe(3);
  });

  it('editing label after publish never touches the already-published snapshot row', async () => {
    repo.findById.mockResolvedValue({ ...BASE_METRIC, currentSnapshotId: 'snap-1' });
    repo.update.mockResolvedValue({ ...BASE_METRIC, currentSnapshotId: 'snap-1', labelEn: 'Renamed' });

    await websiteMetricsService.updateConfig('metric-1', { labelEn: 'Renamed' }, CTX);

    expect(repo.updateSnapshot).not.toHaveBeenCalled();
    expect(repo.createSnapshot).not.toHaveBeenCalled();
  });
});
