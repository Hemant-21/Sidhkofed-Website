/**
 * Unit tests — public website metrics service. Validates the placement allowlist, the public DTO
 * shape (label/value/unit/period/as-of/disclosure only — no internals), empty-result handling, and
 * cache read/write behaviour. Repository/cache mocked.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, cache } = vi.hoisted(() => ({
  repo: { listPublishedForPlacement: vi.fn() },
  cache: { getJson: vi.fn(), setJson: vi.fn() },
}));

vi.mock('./website-metrics.repository', () => ({ websiteMetricsRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));

import { websiteMetricsPublicService } from './website-metrics.public.service';
import { ValidationError } from '@/shared/errors';

function makeRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'wm-1',
    metricKey: 'total-events',
    configRevision: 3,
    currentSnapshot: {
      id: 'snap-1',
      labelEn: 'Total Events',
      labelHi: 'कुल',
      value: { toString: () => '128' } as unknown as number,
      unit: 'events',
      resolvedPeriod: { mode: 'financial_year', start: '2024-04-01T00:00:00.000Z', end: '2025-03-31T00:00:00.000Z' },
      resolvedFilters: { districtId: ['secret-internal-id'] },
      completeness: { known: 100, missing: 0, undated: 0 },
      publicScopePolicyVersion: 2,
      definitionNoteEn: 'Count of events in the resolved period.',
      definitionNoteHi: null,
      calculatedAt: new Date('2025-01-01T00:00:00.000Z'),
      publishedAt: new Date('2025-01-02T00:00:00.000Z'),
    },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  cache.getJson.mockResolvedValue(null);
});

describe('websiteMetricsPublicService.getPublicMetrics', () => {
  it('rejects a missing placement', async () => {
    await expect(websiteMetricsPublicService.getPublicMetrics('')).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects an unknown placement', async () => {
    await expect(websiteMetricsPublicService.getPublicMetrics('unknown_page')).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(repo.listPublishedForPlacement).not.toHaveBeenCalled();
  });

  it('returns an empty array (not an error) for a placement with no published metrics', async () => {
    repo.listPublishedForPlacement.mockResolvedValue([]);
    const result = await websiteMetricsPublicService.getPublicMetrics('homepage');
    expect(result).toEqual({ metrics: [] });
  });

  it('maps the DTO to only label/value/unit/period/as-of/disclosure fields', async () => {
    repo.listPublishedForPlacement.mockResolvedValue([makeRow()]);
    const result = await websiteMetricsPublicService.getPublicMetrics('homepage');
    expect(result.metrics).toHaveLength(1);
    const dto = result.metrics[0];
    expect(dto).toEqual({
      metric_key: 'total-events',
      label_en: 'Total Events',
      label_hi: 'कुल',
      value: 128,
      unit: 'events',
      period: { mode: 'financial_year', start: '2024-04-01T00:00:00.000Z', end: '2025-03-31T00:00:00.000Z' },
      as_of_date: '2025-01-01T00:00:00.000Z',
      disclosure_note_en: 'Count of events in the resolved period.',
      disclosure_note_hi: null,
    });
    // Never leak internal fields.
    expect(dto).not.toHaveProperty('id');
    expect(dto).not.toHaveProperty('config_revision');
    expect(dto).not.toHaveProperty('resolved_filters');
    expect(dto).not.toHaveProperty('completeness');
    expect(dto).not.toHaveProperty('public_scope_policy_version');
  });

  it('calls only listPublishedForPlacement, never an admin-scoped query path', async () => {
    repo.listPublishedForPlacement.mockResolvedValue([]);
    await websiteMetricsPublicService.getPublicMetrics('about_us');
    expect(repo.listPublishedForPlacement).toHaveBeenCalledWith('about_us');
  });

  it('caches the response and serves subsequent calls from cache', async () => {
    repo.listPublishedForPlacement.mockResolvedValue([makeRow()]);
    await websiteMetricsPublicService.getPublicMetrics('homepage');
    expect(cache.setJson).toHaveBeenCalledWith(
      expect.stringContaining('website_metrics:public:homepage'),
      expect.objectContaining({ metrics: expect.any(Array) }),
    );

    cache.getJson.mockResolvedValue({ metrics: [{ metric_key: 'cached' }] });
    const result = await websiteMetricsPublicService.getPublicMetrics('homepage');
    expect(result.metrics[0]).toMatchObject({ metric_key: 'cached' });
    expect(repo.listPublishedForPlacement).toHaveBeenCalledTimes(1); // not called again
  });
});
