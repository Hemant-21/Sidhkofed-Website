/**
 * Public Operational Reports service — `/api/v1/public/operational-reports*`. No authentication.
 *
 * This is the new home for the public `/impact/dashboard` page's data: the old
 * `DashboardReport`/`DashboardMetric` concept (Stage 7's public dashboard) is retired, and the
 * website now reads the SAME six live Operational Reports the admin CMS uses, restricted to:
 *   - only measures flagged `publicEligible: true` in `operational-reports.registry.ts` (the single
 *     source of truth for eligibility — never re-derived here),
 *   - the current financial year (resolved the same way the admin `current_financial_year` period
 *     mode does, via `operational-reports.period.ts` — if no financial year unambiguously covers
 *     today, that IS a real data-setup problem and is surfaced as an error, never silently guessed),
 *   - no filters (the repository's own default scope — published, non-archived — is already the
 *     public-safe scope; see `website-metrics.public-policy.ts` for the identical precedent this
 *     mirrors).
 *
 * Mirrors `website-metrics.public-policy.ts`'s shape: a thin, versioned wrapper around the existing
 * `operationalReportsService.generate()` call. It does not stand up a second query path — the
 * repository's unconditional `PUBLISHED_SCOPE` already IS the public scope, so this module's job is
 * to (a) select only public-eligible measures and (b) version that selection rule so a future change
 * is a deliberate, reviewed bump rather than a silent behavior change in what "public" means.
 */
import { NotFoundError } from '@/shared/errors';
import { cacheService } from '@/services/cache';
import { OPERATIONAL_REPORTS, REPORT_KEYS, isReportKey } from './operational-reports.registry';
import { operationalReportsService } from './operational-reports.service';
import type { CompletenessInfo, ReportKey } from './operational-reports.types';

/**
 * Bump this only on a deliberate, reviewed change to what "public-safe" means for an operational
 * report (e.g. the default period changes from current-FY, or a filter is ever allowed through).
 */
export const PUBLIC_SCOPE_POLICY_VERSION = 1;

/** Cache prefix for this endpoint's responses. Warmed by the dashboard-refresh scheduler job. */
export const OPERATIONAL_REPORTS_PUBLIC_CACHE_PREFIX = 'operational-reports:public';

export interface PublicResolvedPeriodDto {
  mode: string;
  start: string;
  end: string;
}

export interface PublicMeasureDto {
  measure_key: string;
  label_en: string;
  label_hi: string | null;
  unit: string | null;
  value: number | null;
  note_en: string;
  note_hi: string | null;
  completeness: CompletenessInfo | null;
}

export interface PublicReportDto {
  report_key: ReportKey;
  title_en: string;
  title_hi: string | null;
  resolved_period: PublicResolvedPeriodDto;
  measures: PublicMeasureDto[];
}

function cacheKey(key: ReportKey): string {
  return `${OPERATIONAL_REPORTS_PUBLIC_CACHE_PREFIX}:${key}`;
}

/** Drops every cached public operational-report response. Used by the dashboard-refresh job. */
async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${OPERATIONAL_REPORTS_PUBLIC_CACHE_PREFIX}:`);
}

/**
 * Calculate ONE report's public view: current financial year, no filters, public-eligible measures
 * only. Never accepts a caller-supplied period or filter override — this is the one fixed public
 * shape, not a general-purpose query surface.
 */
async function calculatePublicReport(key: ReportKey): Promise<PublicReportDto> {
  const cached = await cacheService.getJson<PublicReportDto>(cacheKey(key));
  if (cached) return cached;

  const def = OPERATIONAL_REPORTS[key];
  const publicMeasureKeys = new Set(def.measures.filter((m) => m.publicEligible).map((m) => m.key));

  const result = await operationalReportsService.generate(key, {
    periodInput: { mode: 'current_financial_year' },
    filters: {},
    page: 1,
    pageSize: 1, // Only the summary measures are needed; supporting rows are discarded.
  });

  const measures: PublicMeasureDto[] = result.summary
    .filter((m) => publicMeasureKeys.has(m.key))
    .map((m) => ({
      measure_key: m.key,
      label_en: m.labelEn,
      label_hi: m.labelHi ?? null,
      unit: m.unit,
      value: m.value,
      note_en: m.noteEn,
      note_hi: m.noteHi ?? null,
      completeness: m.completeness,
    }));

  const dto: PublicReportDto = {
    report_key: key,
    title_en: def.titleEn,
    title_hi: def.titleHi ?? null,
    resolved_period: {
      mode: result.resolvedPeriod.mode,
      start: result.resolvedPeriod.start.toISOString(),
      end: result.resolvedPeriod.end.toISOString(),
    },
    measures,
  };

  await cacheService.setJson(cacheKey(key), dto, 300);
  return dto;
}

/** GET /public/operational-reports — all six reports, public-eligible measures only. */
async function getAllPublicReports(): Promise<{ reports: PublicReportDto[] }> {
  const reports = await Promise.all(REPORT_KEYS.map((key) => calculatePublicReport(key)));
  return { reports };
}

/** GET /public/operational-reports/:key — one report, public-eligible measures only. */
async function getPublicReport(key: string): Promise<PublicReportDto> {
  if (!isReportKey(key)) {
    throw new NotFoundError(`Unknown operational report "${key}".`);
  }
  return calculatePublicReport(key);
}

export const operationalReportsPublicService = {
  getAllPublicReports,
  getPublicReport,
  invalidatePublicCache,
};
