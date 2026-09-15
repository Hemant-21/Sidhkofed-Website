/**
 * Period resolution for Operational Reports. All boundaries are resolved as Asia/Kolkata calendar
 * dates (IST, UTC+5:30, no DST) — stored/compared as UTC-midnight `Date`s representing that
 * calendar day, matching the `@db.Date` columns this module reads (`Event.startDate`,
 * `ToolkitDistributionSummary.distributionDate`, `ProcurementUpdate.effectiveDate`), which are
 * themselves date-only with no time-of-day component.
 *
 * No shared date/timezone util exists yet in `src/utils` (checked: only `slug.ts` and
 * `xlsx-writer.ts`), so this file owns Asia/Kolkata boundary resolution for the module.
 */
import { ValidationError } from '@/shared/errors';
import { operationalReportsRepository } from './operational-reports.repository';
import type { PeriodInput, ResolvedPeriod } from './operational-reports.types';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** `YYYY-MM-DD` → UTC-midnight Date representing that Asia/Kolkata calendar day. */
function parseCalendarDate(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError({ [field]: ['Use a YYYY-MM-DD date.'] });
  }
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError({ [field]: ['Invalid calendar date.'] });
  }
  return d;
}

/** Today's Asia/Kolkata calendar date, as a UTC-midnight Date. */
function todayInKolkata(): Date {
  const now = new Date();
  const istMs = now.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

async function resolveFixedRange(input: PeriodInput): Promise<ResolvedPeriod> {
  if (!input.startDate || !input.endDate) {
    throw new ValidationError({
      periodInput: ['fixed_range requires both startDate and endDate.'],
    });
  }
  const start = parseCalendarDate(input.startDate, 'periodInput.startDate');
  const end = parseCalendarDate(input.endDate, 'periodInput.endDate');
  if (end.getTime() < start.getTime()) {
    throw new ValidationError({ 'periodInput.endDate': ['Must be on or after startDate.'] });
  }
  return {
    mode: 'fixed_range',
    start,
    end,
    basisDescription: `Fixed range ${input.startDate} to ${input.endDate} (inclusive, Asia/Kolkata).`,
  };
}

async function resolveNamedFinancialYear(input: PeriodInput): Promise<ResolvedPeriod> {
  if (!input.financialYearLabel) {
    throw new ValidationError({
      'periodInput.financialYearLabel': ['financial_year requires financialYearLabel.'],
    });
  }
  const fy = await operationalReportsRepository.findFinancialYearByLabel(input.financialYearLabel);
  if (!fy) {
    throw new ValidationError({
      'periodInput.financialYearLabel': [`Unknown financial year "${input.financialYearLabel}".`],
    });
  }
  return {
    mode: 'financial_year',
    start: fy.startDate,
    end: fy.endDate,
    basisDescription: `Financial year ${fy.label} (${fy.startDate.toISOString().slice(0, 10)} to ${fy.endDate.toISOString().slice(0, 10)}).`,
    financialYearLabel: fy.label,
  };
}

/**
 * "Current" financial year must be unambiguous: exactly one `FinancialYear` with `isActive = true`
 * whose [startDate, endDate] contains today (Asia/Kolkata). Zero or more than one match is a clear
 * validation error rather than a guess — `isActive` alone is not treated as "the current FY" since
 * more than one row could carry it.
 */
async function resolveCurrentFinancialYear(): Promise<ResolvedPeriod> {
  const today = todayInKolkata();
  const candidates = await operationalReportsRepository.findActiveFinancialYearsCovering(today);
  if (candidates.length === 0) {
    throw new ValidationError({
      periodInput: ['No active financial year covers today\'s date. Specify an explicit period instead.'],
    });
  }
  if (candidates.length > 1) {
    throw new ValidationError({
      periodInput: [
        `Ambiguous current financial year: ${candidates.length} active financial years cover today's date (${candidates
          .map((c) => c.label)
          .join(', ')}). Specify an explicit financial_year instead.`,
      ],
    });
  }
  const fy = candidates[0]!;
  return {
    mode: 'current_financial_year',
    start: fy.startDate,
    end: fy.endDate,
    basisDescription: `Current financial year ${fy.label} (${fy.startDate.toISOString().slice(0, 10)} to ${fy.endDate.toISOString().slice(0, 10)}).`,
    financialYearLabel: fy.label,
  };
}

/** Reject conflicting inputs (e.g. a fixed range AND a financial-year selector together). */
function assertNoConflictingSelectors(input: PeriodInput): void {
  const hasFixedRange = input.startDate !== undefined || input.endDate !== undefined;
  const hasFyLabel = input.financialYearLabel !== undefined;
  if (input.mode === 'fixed_range' && hasFyLabel) {
    throw new ValidationError({
      periodInput: ['Cannot combine a fixed date range with a financial year selector.'],
    });
  }
  if (input.mode !== 'fixed_range' && hasFixedRange) {
    throw new ValidationError({
      periodInput: ['Cannot combine a financial year selector with explicit startDate/endDate.'],
    });
  }
}

export async function resolvePeriod(input: PeriodInput): Promise<ResolvedPeriod> {
  assertNoConflictingSelectors(input);
  switch (input.mode) {
    case 'fixed_range':
      return resolveFixedRange(input);
    case 'financial_year':
      return resolveNamedFinancialYear(input);
    case 'current_financial_year':
      return resolveCurrentFinancialYear();
    default:
      throw new ValidationError({ 'periodInput.mode': ['Unknown period mode.'] });
  }
}
