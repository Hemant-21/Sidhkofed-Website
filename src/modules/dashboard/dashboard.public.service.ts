/**
 * Public Dashboard service (API spec §5). Exposes ONLY active, published, publicly-visible reports
 * and their resolved metrics — never internal datasets, import metadata (`raw_rows`, source file),
 * administrative authorship, or `is_active=false` reports. Responses are Redis-cached and invalidated
 * on any admin write. Reports are the FIXED predefined set; this layer resolves metrics for the
 * requested financial year / reporting period only.
 */
import { NotFoundError } from '@/shared/errors';
import { cacheService } from '@/services/cache';
import { dashboardRepository, type ReportRow } from './dashboard.repository';
import {
  toPublicReportDetailDto,
  type PublicReportDetailDto,
} from './dashboard.dto';
import { DASHBOARD_PUBLIC_CACHE_PREFIX } from './dashboard.shared';
import type { PublicDashboardFilters } from './dashboard.types';

function periodKey(filters: PublicDashboardFilters): string {
  return `${filters.financialYear ?? 'all'}:${filters.reportingPeriod ?? 'all'}`;
}

async function resolveReport(
  report: ReportRow,
  filters: PublicDashboardFilters,
): Promise<PublicReportDetailDto> {
  const metrics = await dashboardRepository.listPublicMetrics(
    report.id,
    filters.financialYear ?? null,
    filters.reportingPeriod ?? null,
  );
  return toPublicReportDetailDto(report, metrics);
}

/** GET /public/dashboard — all active public reports, each with resolved metrics (bounded set). */
export async function dashboard(filters: PublicDashboardFilters): Promise<{ reports: PublicReportDetailDto[] }> {
  const cacheKey = `${DASHBOARD_PUBLIC_CACHE_PREFIX}:dashboard:${periodKey(filters)}`;
  const cached = await cacheService.getJson<{ reports: PublicReportDetailDto[] }>(cacheKey);
  if (cached) return cached;
  const { rows } = await dashboardRepository.listReports(
    {},
    0,
    100,
    { public: true, ordering: { field: 'display_order', direction: 'asc' } },
  );
  const reports = await Promise.all(rows.map((r) => resolveReport(r, filters)));
  const result = { reports };
  await cacheService.setJson(cacheKey, result);
  return result;
}

/** GET /public/dashboard/kpis — the homepage-safe subset (reports flagged `show_on_homepage`). */
export async function kpis(filters: PublicDashboardFilters): Promise<{ kpis: PublicReportDetailDto[] }> {
  const cacheKey = `${DASHBOARD_PUBLIC_CACHE_PREFIX}:kpis:${periodKey(filters)}`;
  const cached = await cacheService.getJson<{ kpis: PublicReportDetailDto[] }>(cacheKey);
  if (cached) return cached;
  const rows = await dashboardRepository.listHomepageReports();
  const resolved = await Promise.all(rows.map((r) => resolveReport(r, filters)));
  const result = { kpis: resolved };
  await cacheService.setJson(cacheKey, result);
  return result;
}

/** GET /public/dashboard/{report_key} — one fixed report + its resolved metrics. */
export async function reportByKey(
  reportKey: string,
  filters: PublicDashboardFilters,
): Promise<PublicReportDetailDto> {
  const cacheKey = `${DASHBOARD_PUBLIC_CACHE_PREFIX}:report:${reportKey}:${periodKey(filters)}`;
  const cached = await cacheService.getJson<PublicReportDetailDto>(cacheKey);
  if (cached) return cached;
  const report = await dashboardRepository.findReportByKey(reportKey, { public: true });
  if (!report) throw new NotFoundError('Dashboard report not found.');
  const dto = await resolveReport(report, filters);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const dashboardPublicService = { dashboard, kpis, reportByKey };
