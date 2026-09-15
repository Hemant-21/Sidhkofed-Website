/**
 * Unit tests — public Operational Reports service. `operationalReportsService.generate` and
 * `cacheService` are mocked so these never touch Prisma. Verifies: only `publicEligible` measures
 * ever appear (checked against the registry for all six reports), current-financial-year period
 * resolution is requested with no filters, 404 for an unknown report key, and cache read/write
 * behaviour.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { service, cache } = vi.hoisted(() => ({
  service: { generate: vi.fn() },
  cache: { getJson: vi.fn(), setJson: vi.fn(), delByPrefix: vi.fn() },
}));

vi.mock('./operational-reports.service', () => ({ operationalReportsService: service }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));

import { operationalReportsPublicService } from './operational-reports.public.service';
import { OPERATIONAL_REPORTS, REPORT_KEYS } from './operational-reports.registry';
import { NotFoundError } from '@/shared/errors';
import type { ReportKey } from './operational-reports.types';

const RESOLVED_PERIOD = {
  mode: 'current_financial_year',
  start: new Date('2025-04-01T00:00:00.000Z'),
  end: new Date('2026-03-31T00:00:00.000Z'),
  basisDescription: 'Current financial year FY 2025-26.',
  financialYearLabel: 'FY 2025-26',
};

/** A generate() result exposing EVERY measure defined for the report (public and non-public alike). */
function makeGenerateResult(key: ReportKey) {
  const def = OPERATIONAL_REPORTS[key];
  return {
    reportKey: key,
    resolvedPeriod: RESOLVED_PERIOD,
    filters: {},
    summary: def.measures.map((m) => ({
      key: m.key,
      calculationVersion: m.calculationVersion,
      labelEn: m.labelEn,
      labelHi: m.labelHi,
      unit: m.unit,
      value: 42,
      completeness: { known: 42, missing: 0, undated: 0 },
      noteEn: m.noteEn,
      noteHi: m.noteHi,
    })),
    rows: { items: [], total: 0, page: 1, pageSize: 1 },
    calculatedAt: new Date('2025-09-12T00:00:00.000Z'),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  cache.getJson.mockResolvedValue(null);
  service.generate.mockImplementation(async (key: ReportKey) => makeGenerateResult(key));
});

describe('operationalReportsPublicService.getPublicReport', () => {
  it('rejects an unknown report key with NotFoundError', async () => {
    await expect(operationalReportsPublicService.getPublicReport('not_a_report')).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(service.generate).not.toHaveBeenCalled();
  });

  it('requests the current financial year with no filters, for a minimal page', async () => {
    await operationalReportsPublicService.getPublicReport('event_activity_outcomes');
    expect(service.generate).toHaveBeenCalledWith('event_activity_outcomes', {
      periodInput: { mode: 'current_financial_year' },
      filters: {},
      page: 1,
      pageSize: 1,
    });
  });

  it('never returns a non-publicEligible measure, for every report', async () => {
    for (const key of REPORT_KEYS) {
      cache.getJson.mockResolvedValueOnce(null);
      const dto = await operationalReportsPublicService.getPublicReport(key);
      const def = OPERATIONAL_REPORTS[key];
      const nonPublicKeys = def.measures.filter((m) => !m.publicEligible).map((m) => m.key);
      const returnedKeys = dto.measures.map((m) => m.measure_key);
      for (const nonPublicKey of nonPublicKeys) {
        expect(returnedKeys).not.toContain(nonPublicKey);
      }
      // Every publicEligible measure IS present.
      const publicKeys = def.measures.filter((m) => m.publicEligible).map((m) => m.key);
      expect(returnedKeys.sort()).toEqual(publicKeys.sort());
    }
  });

  it('shapes the DTO with report_key/title/resolved_period/measures fields exactly', async () => {
    const dto = await operationalReportsPublicService.getPublicReport('event_activity_outcomes');
    expect(dto.report_key).toBe('event_activity_outcomes');
    expect(dto.title_en).toBe(OPERATIONAL_REPORTS.event_activity_outcomes.titleEn);
    expect(dto.resolved_period).toEqual({
      mode: 'current_financial_year',
      start: '2025-04-01T00:00:00.000Z',
      end: '2026-03-31T00:00:00.000Z',
    });
    const measure = dto.measures.find((m) => m.measure_key === 'total_events');
    expect(measure).toEqual({
      measure_key: 'total_events',
      label_en: 'Total events (in period)',
      label_hi: 'कुल गतिविधियाँ',
      unit: 'events',
      value: 42,
      note_en: OPERATIONAL_REPORTS.event_activity_outcomes.measures[0]!.noteEn,
      note_hi: OPERATIONAL_REPORTS.event_activity_outcomes.measures[0]!.noteHi ?? null,
      completeness: { known: 42, missing: 0, undated: 0 },
    });
    // Internal-only measure never appears.
    expect(dto.measures.map((m) => m.measure_key)).not.toContain('overdue_incomplete_events');
  });

  it('caches the response and serves subsequent calls from cache without recomputing', async () => {
    await operationalReportsPublicService.getPublicReport('training_attendance');
    expect(cache.setJson).toHaveBeenCalledWith(
      expect.stringContaining('operational-reports:public:training_attendance'),
      expect.objectContaining({ report_key: 'training_attendance' }),
      300,
    );

    cache.getJson.mockResolvedValueOnce({ report_key: 'training_attendance', cached: true });
    const dto = await operationalReportsPublicService.getPublicReport('training_attendance');
    expect(dto).toMatchObject({ cached: true });
    expect(service.generate).toHaveBeenCalledTimes(1); // not called again
  });
});

describe('operationalReportsPublicService.getAllPublicReports', () => {
  it('returns all six reports', async () => {
    const { reports } = await operationalReportsPublicService.getAllPublicReports();
    expect(reports.map((r) => r.report_key).sort()).toEqual([...REPORT_KEYS].sort());
  });

  it('never leaks a non-publicEligible measure across any of the six reports', async () => {
    const { reports } = await operationalReportsPublicService.getAllPublicReports();
    for (const report of reports) {
      const def = OPERATIONAL_REPORTS[report.report_key];
      const nonPublicKeys = new Set(def.measures.filter((m) => !m.publicEligible).map((m) => m.key));
      for (const measure of report.measures) {
        expect(nonPublicKeys.has(measure.measure_key)).toBe(false);
      }
    }
  });
});

describe('operationalReportsPublicService.invalidatePublicCache', () => {
  it('drops the public operational-reports cache prefix', async () => {
    await operationalReportsPublicService.invalidatePublicCache();
    expect(cache.delByPrefix).toHaveBeenCalledWith('operational-reports:public:');
  });
});
