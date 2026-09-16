/**
 * Public read side of Report Publications. No auth, no live query fallback — every response comes
 * straight from an immutable `ReportPublication` row (or says plainly that none exists for the
 * requested FY). Never exposes `publishedById`/internal audit fields — only what the public site
 * needs (label, boundaries, timestamp, the three report payloads).
 */
import { NotFoundError } from '@/shared/errors';
import { publicationsRepository as repo } from './publications.repository';
import type { ReportResult } from '../reports.types';

export interface PublicFinancialYearSummary {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrentFinancialYear: boolean;
  isAllYearsAggregate: boolean;
  isPublished: boolean;
  publishedAt: string | null;
}

async function listYears(): Promise<PublicFinancialYearSummary[]> {
  const [all, published] = await Promise.all([repo.listAllFinancialYears(), repo.listPublishedFinancialYears()]);
  const publishedAtById = new Map(published.map((f) => [f.id, f.currentReportPublication?.publishedAt ?? null]));
  const today = new Date();
  const sorted = [...all].sort((a, b) => {
    if (a.isAllYearsAggregate !== b.isAllYearsAggregate) return a.isAllYearsAggregate ? -1 : 1;
    return b.startDate.getTime() - a.startDate.getTime();
  });
  return sorted.map((fy) => ({
    id: fy.id,
    label: fy.label,
    startDate: fy.startDate.toISOString().slice(0, 10),
    endDate: fy.endDate.toISOString().slice(0, 10),
    isCurrentFinancialYear: !fy.isAllYearsAggregate && fy.isActive && fy.startDate <= today && fy.endDate >= today,
    isAllYearsAggregate: fy.isAllYearsAggregate,
    isPublished: publishedAtById.has(fy.id),
    publishedAt: publishedAtById.get(fy.id)?.toISOString() ?? null,
  }));
}

export interface PublicReportBundle {
  financialYear: { id: string; label: string; startDate: string; endDate: string };
  publishedAt: string;
  calculationVersion: number;
  programmeReport: ReportResult;
  districtReport: ReportResult;
  commodityReport: ReportResult;
}

async function getForFinancialYearLabel(label: string): Promise<PublicReportBundle> {
  const found = await repo.findCurrentPublicationByFinancialYearLabel(label);
  if (!found) throw new NotFoundError(`Unknown financial year "${label}".`);
  if (!found.currentReportPublication) {
    throw new NotFoundError(`Financial year "${label}" has not been published yet.`);
  }
  const pub = found.currentReportPublication;
  return {
    financialYear: {
      id: found.id,
      label: found.label,
      startDate: found.startDate.toISOString().slice(0, 10),
      endDate: found.endDate.toISOString().slice(0, 10),
    },
    publishedAt: pub.publishedAt.toISOString(),
    calculationVersion: pub.calculationVersion,
    programmeReport: pub.programmeReport as unknown as ReportResult,
    districtReport: pub.districtReport as unknown as ReportResult,
    commodityReport: pub.commodityReport as unknown as ReportResult,
  };
}

export const publicationsPublicService = { listYears, getForFinancialYearLabel };
