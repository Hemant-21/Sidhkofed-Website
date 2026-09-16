/**
 * FY snapshot publication — Generate preview → Review → Approve & publish, for all three Reports
 * together. Uses a short-lived, cache-backed, single-use preview token as the only thing
 * `publish()` trusts — it NEVER recalculates during approval, so what gets published is exactly
 * what was reviewed (the same precedent the now-retired Website Metrics module established).
 *
 * A publication always covers the FULL FY dataset (no filters) — CMS filter selections never
 * affect what gets published, per spec.
 */
import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { cacheService } from '@/services/cache';
import type { AuditContext } from '@/modules/audit/audit.service';
import { auditService } from '@/modules/audit/audit.service';
import { reportsService } from '../reports.service';
import { REPORT_CALCULATION_VERSION, type ReportResult } from '../reports.types';
import { publicationsRepository as repo } from './publications.repository';

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

const PREVIEW_TOKEN_PREFIX = 'report_publications:preview:';
const PREVIEW_TTL_SECONDS = 15 * 60;

interface PreviewPayload {
  financialYearId: string;
  calculationVersion: number;
  fyStartDate: string;
  fyEndDate: string;
  generatedAt: string;
  programmeReport: ReportResult;
  districtReport: ReportResult;
  commodityReport: ReportResult;
}

async function loadFinancialYear(financialYearId: string) {
  const fy = await repo.findFinancialYearById(financialYearId);
  if (!fy) throw new NotFoundError('Financial year not found.');
  return fy;
}

/** Full-FY, no-filter generation for all three reports, tagged `scope: 'public_preview'`. */
async function computeFullFyReports(financialYearId: string): Promise<{
  programmeReport: ReportResult;
  districtReport: ReportResult;
  commodityReport: ReportResult;
}> {
  const emptyFilters = { financialYearId };
  const [programmeReport, districtReport, commodityReport] = await Promise.all([
    reportsService.generateProgrammeReport(emptyFilters),
    reportsService.generateDistrictReport(emptyFilters),
    reportsService.generateCommodityReport(emptyFilters),
  ]);
  const tag = <R extends ReportResult>(r: R): R => ({ ...r, scope: 'public_preview' });
  return { programmeReport: tag(programmeReport), districtReport: tag(districtReport), commodityReport: tag(commodityReport) };
}

/** `POST /admin/dashboard/reports/publications/:financialYearId/preview` — computes and caches. */
async function generatePreview(financialYearId: string): Promise<{ previewToken: string } & PreviewPayload> {
  const fy = await loadFinancialYear(financialYearId);
  const { programmeReport, districtReport, commodityReport } = await computeFullFyReports(fy.id);

  const generatedAt = new Date().toISOString();
  const payload: PreviewPayload = {
    financialYearId: fy.id,
    calculationVersion: REPORT_CALCULATION_VERSION,
    fyStartDate: fy.startDate.toISOString().slice(0, 10),
    fyEndDate: fy.endDate.toISOString().slice(0, 10),
    generatedAt,
    programmeReport,
    districtReport,
    commodityReport,
  };

  const previewToken = randomUUID();
  await cacheService.setJson(`${PREVIEW_TOKEN_PREFIX}${previewToken}`, payload, PREVIEW_TTL_SECONDS);

  return { previewToken, ...payload };
}

/**
 * `POST /admin/dashboard/reports/publications/:financialYearId/publish` — body `{ previewToken }`.
 * Consumes the exact cached preview; rejects if expired, for a different FY, or if the registry's
 * `REPORT_CALCULATION_VERSION` has changed since the token was issued (a code deploy landed mid
 * review — the reviewer must preview again against the new calculation).
 */
async function publish(financialYearId: string, previewToken: string, ctx: AuditContext) {
  const userId = requireUser(ctx);
  const fy = await loadFinancialYear(financialYearId);

  const cacheKey = `${PREVIEW_TOKEN_PREFIX}${previewToken}`;
  const payload = await cacheService.getJson<PreviewPayload>(cacheKey);
  if (!payload) {
    throw new ConflictError('Preview token is invalid or has expired. Generate a new preview before publishing.');
  }
  if (payload.financialYearId !== fy.id) {
    throw new ConflictError('Preview token does not belong to this financial year.');
  }
  if (payload.calculationVersion !== REPORT_CALCULATION_VERSION) {
    throw new ConflictError('The report calculation logic changed after this preview was generated. Generate a new preview before publishing.');
  }

  // Single-use: consume immediately so a duplicate publish call cannot create two publications.
  await cacheService.del(cacheKey);

  const created = await repo.createPublicationAndRepoint({
    financialYearId: fy.id,
    calculationVersion: payload.calculationVersion,
    fyStartDate: fy.startDate,
    fyEndDate: fy.endDate,
    programmeReport: { ...payload.programmeReport, scope: 'public_published' } as never,
    districtReport: { ...payload.districtReport, scope: 'public_published' } as never,
    commodityReport: { ...payload.commodityReport, scope: 'public_published' } as never,
    generatedAt: new Date(payload.generatedAt),
    publishedById: userId,
  });

  await auditService.publish(ctx, 'report_publication', created.id, {
    newState: 'published',
    metadata: { financial_year_label: fy.label, calculation_version: payload.calculationVersion },
  });

  return created;
}

async function getStatusForFy(financialYearId: string) {
  const fy = await repo.findFinancialYearWithCurrentPublication(financialYearId);
  if (!fy) throw new NotFoundError('Financial year not found.');
  return {
    financialYearId: fy.id,
    financialYearLabel: fy.label,
    published: fy.currentReportPublication !== null,
    lastPublished: fy.currentReportPublication
      ? {
          id: fy.currentReportPublication.id,
          publishedAt: fy.currentReportPublication.publishedAt.toISOString(),
          publishedByName: fy.currentReportPublication.publishedBy.fullName,
          generatedAt: fy.currentReportPublication.generatedAt.toISOString(),
          calculationVersion: fy.currentReportPublication.calculationVersion,
        }
      : null,
  };
}

async function getHistoryForFy(financialYearId: string) {
  await loadFinancialYear(financialYearId);
  const rows = await repo.listPublicationHistory(financialYearId);
  return rows.map((r) => ({
    id: r.id,
    publishedAt: r.publishedAt.toISOString(),
    publishedByName: r.publishedBy.fullName,
    generatedAt: r.generatedAt.toISOString(),
    calculationVersion: r.calculationVersion,
  }));
}

async function getPublicationById(id: string) {
  const row = await repo.findPublicationById(id);
  if (!row) throw new NotFoundError('Report publication not found.');
  return row;
}

/** Public read — the currently-live snapshot for a FY, by id or label. `null` when unpublished. */
async function getCurrentForPublic(opts: { financialYearId?: string; financialYearLabel?: string }) {
  const fy = opts.financialYearId
    ? await repo.findCurrentPublicationByFinancialYearId(opts.financialYearId)
    : opts.financialYearLabel
      ? await repo.findCurrentPublicationByFinancialYearLabel(opts.financialYearLabel)
      : null;
  if (!fy) return null;
  if (!fy.currentReportPublication) return { financialYear: fy, publication: null };
  return { financialYear: fy, publication: fy.currentReportPublication };
}

async function listPublishedFinancialYears() {
  return repo.listPublishedFinancialYears();
}

export const publicationsService = {
  generatePreview,
  publish,
  getStatusForFy,
  getHistoryForFy,
  getPublicationById,
  getCurrentForPublic,
  listPublishedFinancialYears,
};
