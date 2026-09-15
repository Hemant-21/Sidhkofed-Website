/**
 * Unit tests — period resolution. The repository is mocked (FinancialYear lookups only) so these
 * tests never touch Prisma/the DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = vi.hoisted(() => ({
  findFinancialYearByLabel: vi.fn(),
  findActiveFinancialYearsCovering: vi.fn(),
}));

vi.mock('./operational-reports.repository', () => ({ operationalReportsRepository: repo }));

import { resolvePeriod } from './operational-reports.period';

beforeEach(() => {
  repo.findFinancialYearByLabel.mockReset();
  repo.findActiveFinancialYearsCovering.mockReset();
});

describe('resolvePeriod — fixed_range', () => {
  it('resolves inclusive boundaries from explicit ISO dates', async () => {
    const result = await resolvePeriod({ mode: 'fixed_range', startDate: '2025-04-01', endDate: '2025-06-30' });
    expect(result.start.toISOString()).toBe('2025-04-01T00:00:00.000Z');
    expect(result.end.toISOString()).toBe('2025-06-30T00:00:00.000Z');
    expect(result.mode).toBe('fixed_range');
  });

  it('rejects missing startDate/endDate', async () => {
    await expect(resolvePeriod({ mode: 'fixed_range', startDate: '2025-04-01' })).rejects.toThrow();
  });

  it('rejects end before start', async () => {
    await expect(
      resolvePeriod({ mode: 'fixed_range', startDate: '2025-06-30', endDate: '2025-04-01' }),
    ).rejects.toThrow();
  });

  it('rejects a fixed range combined with a financial year selector', async () => {
    await expect(
      resolvePeriod({
        mode: 'fixed_range',
        startDate: '2025-04-01',
        endDate: '2025-06-30',
        financialYearLabel: 'FY2025-26',
      } as never),
    ).rejects.toThrow();
  });
});

describe('resolvePeriod — financial_year', () => {
  it('resolves from the named FinancialYear row', async () => {
    repo.findFinancialYearByLabel.mockResolvedValue({
      label: 'FY2025-26',
      startDate: new Date('2025-04-01T00:00:00.000Z'),
      endDate: new Date('2026-03-31T00:00:00.000Z'),
    });
    const result = await resolvePeriod({ mode: 'financial_year', financialYearLabel: 'FY2025-26' });
    expect(result.financialYearLabel).toBe('FY2025-26');
    expect(result.start.toISOString()).toBe('2025-04-01T00:00:00.000Z');
  });

  it('rejects an unknown financial year label', async () => {
    repo.findFinancialYearByLabel.mockResolvedValue(null);
    await expect(
      resolvePeriod({ mode: 'financial_year', financialYearLabel: 'nope' }),
    ).rejects.toThrow();
  });

  it('rejects a financial-year selector combined with explicit dates', async () => {
    await expect(
      resolvePeriod({
        mode: 'financial_year',
        financialYearLabel: 'FY2025-26',
        startDate: '2025-04-01',
      } as never),
    ).rejects.toThrow();
  });
});

describe('resolvePeriod — current_financial_year', () => {
  it('resolves the single active FY covering today', async () => {
    repo.findActiveFinancialYearsCovering.mockResolvedValue([
      { label: 'FY2025-26', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31') },
    ]);
    const result = await resolvePeriod({ mode: 'current_financial_year' });
    expect(result.financialYearLabel).toBe('FY2025-26');
  });

  it('throws a clear ambiguity error when zero FYs cover today', async () => {
    repo.findActiveFinancialYearsCovering.mockResolvedValue([]);
    await expect(resolvePeriod({ mode: 'current_financial_year' })).rejects.toThrow();
  });

  it('throws a clear ambiguity error when multiple FYs cover today', async () => {
    repo.findActiveFinancialYearsCovering.mockResolvedValue([
      { label: 'FY-A', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31') },
      { label: 'FY-B', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') },
    ]);
    try {
      await resolvePeriod({ mode: 'current_financial_year' });
      throw new Error('expected resolvePeriod to reject');
    } catch (err: any) {
      expect(err.fields.periodInput[0]).toMatch(/Ambiguous/);
    }
  });
});
