/**
 * Unit tests — Operational Reports service. The repository is mocked so these never touch Prisma;
 * they verify the service assembles the `ReportResult` contract correctly and preserves the
 * null-vs-zero / dedup / undated-record rules from the repository's mocked output.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = vi.hoisted(() => ({
  findFinancialYearByLabel: vi.fn(),
  findActiveFinancialYearsCovering: vi.fn(),
  eventActivityOutcomesSummary: vi.fn(),
  eventActivityOutcomesRows: vi.fn(),
  trainingAttendanceSummary: vi.fn(),
  trainingAttendanceRows: vi.fn(),
  programmeActivityCoverage: vi.fn(),
  districtActivityCoverage: vi.fn(),
  toolkitDistributionSummary: vi.fn(),
  toolkitDistributionRows: vi.fn(),
  procurementRegisterSummary: vi.fn(),
  procurementRegisterRows: vi.fn(),
}));

vi.mock('./operational-reports.repository', () => ({ operationalReportsRepository: repo }));

import { operationalReportsService } from './operational-reports.service';

const FIXED_RANGE = { periodInput: { mode: 'fixed_range', startDate: '2025-04-01', endDate: '2025-06-30' } };

beforeEach(() => {
  Object.values(repo).forEach((fn) => fn.mockReset());
});

describe('listCatalogue', () => {
  it('returns all six report definitions', () => {
    const cat = operationalReportsService.listCatalogue();
    expect(cat.map((r) => r.key).sort()).toEqual(
      [
        'district_activity_coverage',
        'event_activity_outcomes',
        'procurement_register',
        'programme_activity_coverage',
        'toolkit_item_distribution',
        'training_attendance',
      ].sort(),
    );
  });
});

describe('generate — event_activity_outcomes', () => {
  it('rejects an unknown report key', async () => {
    await expect(operationalReportsService.generate('not_a_report', FIXED_RANGE)).rejects.toThrow();
  });

  it('shapes summary measures from repository aggregates', async () => {
    repo.eventActivityOutcomesSummary.mockResolvedValue({
      totalEvents: 10,
      completedEvents: 7,
      overdueIncomplete: 2,
    });
    repo.eventActivityOutcomesRows.mockResolvedValue({ items: [], total: 10 });

    const result = await operationalReportsService.generate('event_activity_outcomes', FIXED_RANGE);
    expect(result.reportKey).toBe('event_activity_outcomes');
    const byKey = Object.fromEntries(result.summary.map((m) => [m.key, m]));
    expect(byKey.total_events.value).toBe(10);
    expect(byKey.completed_events.value).toBe(7);
    expect(byKey.overdue_incomplete_events.value).toBe(2);
    expect(byKey.overdue_incomplete_events.completeness).toBeNull();
  });
});

describe('generate — training_attendance', () => {
  it('preserves null (not zero) when no completed training has a recorded count', async () => {
    repo.trainingAttendanceSummary.mockResolvedValue({
      completedTrainingCount: 3,
      recordedAttendance: null,
      attendanceKnownCount: 0,
      attendanceMissingCount: 3,
    });
    repo.trainingAttendanceRows.mockResolvedValue({ items: [], total: 3 });

    const result = await operationalReportsService.generate('training_attendance', FIXED_RANGE);
    const attendance = result.summary.find((m) => m.key === 'recorded_attendance')!;
    expect(attendance.value).toBeNull();
    expect(attendance.completeness).toEqual({ known: 0, missing: 3, undated: 0 });
  });

  it('sums recorded attendance from completed events only, distinct from missing counts', async () => {
    repo.trainingAttendanceSummary.mockResolvedValue({
      completedTrainingCount: 5,
      recordedAttendance: 120,
      attendanceKnownCount: 4,
      attendanceMissingCount: 1,
    });
    repo.trainingAttendanceRows.mockResolvedValue({ items: [], total: 5 });

    const result = await operationalReportsService.generate('training_attendance', FIXED_RANGE);
    const attendance = result.summary.find((m) => m.key === 'recorded_attendance')!;
    expect(attendance.value).toBe(120);
    expect(attendance.noteEn).toMatch(/NOT a count of unique beneficiaries/);
  });
});

describe('generate — district_activity_coverage', () => {
  it('groups a null districtId under an explicit Unknown row rather than dropping it', async () => {
    repo.districtActivityCoverage.mockResolvedValue({
      totalGroups: [
        { districtId: 'd1', _count: { _all: 5 } },
        { districtId: null, _count: { _all: 2 } },
      ],
      completedGroups: [
        { districtId: 'd1', _count: { _all: 3 }, _sum: { finalParticipantCount: 50 } },
      ],
    });

    const result = await operationalReportsService.generate('district_activity_coverage', FIXED_RANGE);
    const unknownRow = result.rows.items.find((r: any) => r.district_id === null);
    expect(unknownRow).toBeDefined();
    expect(unknownRow.district_label).toBe('Unknown');
    expect(unknownRow.total_events).toBe(2);
    expect(unknownRow.completed_events).toBe(0);
  });
});

describe('generate — toolkit_item_distribution', () => {
  it('counts completed distributions once per summary, never per item, and flags missing quantity', async () => {
    repo.toolkitDistributionSummary.mockResolvedValue({
      completedDistributions: 4,
      participantsCovered: 80,
      participantsKnownCount: 4,
      participantsMissingCount: 0,
      undatedDistributions: 1,
      itemTotals: [
        { toolkitItemId: 'i1', _sum: { totalQuantity: 100 }, _count: { _all: 4 } },
        { toolkitItemId: 'i2', _sum: { totalQuantity: null }, _count: { _all: 2 } },
      ],
      itemMeta: [
        { id: 'i1', nameEn: 'Spade', nameHi: null, unit: 'pcs' },
        { id: 'i2', nameEn: 'Seeds', nameHi: null, unit: 'kg' },
      ],
      itemsMissingQuantity: 1,
    });
    repo.toolkitDistributionRows.mockResolvedValue({ items: [], total: 4 });

    const result = await operationalReportsService.generate('toolkit_item_distribution', FIXED_RANGE);
    const completed = result.summary.find((m) => m.key === 'completed_distributions')!;
    expect(completed.value).toBe(4);
    expect(completed.completeness?.undated).toBe(1);
    const qty = result.summary.find((m) => m.key === 'quantity_by_item_unit')!;
    expect(qty.completeness?.missing).toBe(1);
  });
});

describe('generate — procurement_register', () => {
  it('never combines rate groups across units into a single figure', async () => {
    repo.procurementRegisterSummary.mockResolvedValue({
      pricedUpdateCount: 6,
      undated: 1,
      groups: [
        {
          commodityId: 'c1',
          procurementUpdateTypeId: 't1',
          unit: 'quintal',
          _min: { rate: 100 },
          _max: { rate: 150 },
          _count: { _all: 3 },
          latestRate: 150,
          latestEffectiveDate: new Date('2025-05-01'),
          tie: false,
        },
        {
          commodityId: 'c1',
          procurementUpdateTypeId: 't1',
          unit: 'kg',
          _min: { rate: 10 },
          _max: { rate: 12 },
          _count: { _all: 3 },
          latestRate: 12,
          latestEffectiveDate: new Date('2025-05-02'),
          tie: true,
        },
      ],
    });
    repo.procurementRegisterRows.mockResolvedValue({ items: [], total: 6 });

    const result = await operationalReportsService.generate('procurement_register', FIXED_RANGE);
    const rateGroups = result.rows.items.filter((r: any) => 'unit' in r && 'min_rate' in r);
    expect(rateGroups).toHaveLength(2);
    const units = rateGroups.map((r: any) => r.unit);
    expect(units).toEqual(expect.arrayContaining(['quintal', 'kg']));
    const kgGroup = rateGroups.find((r: any) => r.unit === 'kg');
    expect(kgGroup.latest_is_tied).toBe(true);
    // No measure sums quantity or blends rate across units into a single scalar.
    const summaryValues = result.summary.map((m) => m.key);
    expect(summaryValues).not.toContain('total_quantity');
    expect(summaryValues).not.toContain('overall_rate');
  });
});

describe('generateForExport', () => {
  it('rejects an unknown report key', async () => {
    await expect(operationalReportsService.generateForExport('not_a_report', FIXED_RANGE)).rejects.toThrow();
  });

  it('rejects a body carrying page/pageSize (export has no pagination)', async () => {
    await expect(
      operationalReportsService.generateForExport('event_activity_outcomes', { ...FIXED_RANGE, page: 2 }),
    ).rejects.toThrow();
  });

  it('reuses the same computeReport path as generate() and returns the full row set', async () => {
    repo.eventActivityOutcomesSummary.mockResolvedValue({ totalEvents: 3, completedEvents: 2, overdueIncomplete: 0 });
    repo.eventActivityOutcomesRows.mockResolvedValue({
      items: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }],
      total: 3,
    });

    const result = await operationalReportsService.generateForExport('event_activity_outcomes', FIXED_RANGE);
    expect(result.rows.items).toHaveLength(3);
    expect(result.rows.total).toBe(3);
    const byKey = Object.fromEntries(result.summary.map((m) => [m.key, m]));
    expect(byKey.total_events.value).toBe(3);
  });

  it('rejects with a 4xx-mapped error when the result exceeds the export row limit', async () => {
    repo.eventActivityOutcomesSummary.mockResolvedValue({ totalEvents: 1, completedEvents: 1, overdueIncomplete: 0 });
    // Simulate the repository reporting more rows than the export ceiling.
    const overLimitTotal = 50_001;
    repo.eventActivityOutcomesRows.mockResolvedValue({
      items: Array.from({ length: overLimitTotal }, (_, i) => ({ id: `e${i}` })),
      total: overLimitTotal,
    });

    await expect(
      operationalReportsService.generateForExport('event_activity_outcomes', FIXED_RANGE),
    ).rejects.toMatchObject({ statusCode: 413 });
  });
});
