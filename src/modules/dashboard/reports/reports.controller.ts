/**
 * Reports admin controllers — `/api/v1/admin/dashboard/reports/*`. HTTP-only: parse → call the
 * service → return through the shared envelope. Permissions are enforced at the route layer.
 */
import type { NextFunction, Request, Response } from 'express';
import { success } from '@/shared/envelope';
import { writeXlsx } from '@/utils/xlsx-writer';
import { reportsService, type RawFilterInput } from './reports.service';
import { buildReportExportSheets } from './reports.export';
import type { ReportKey } from './reports.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function parseFilters(body: unknown): RawFilterInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const asStringArray = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;
  return {
    financialYearId: typeof b.financialYearId === 'string' ? b.financialYearId : undefined,
    programmeIds: asStringArray(b.programmeIds),
    districtIds: asStringArray(b.districtIds),
    blockIds: asStringArray(b.blockIds),
    eventTypeIds: asStringArray(b.eventTypeIds),
    commodityIds: asStringArray(b.commodityIds),
    includeUnassignedProgramme: b.includeUnassignedProgramme === true,
  };
}

const listFilterOptions = wrap(async (req) => {
  const data = await reportsService.listFilterOptions();
  return { status: 200, body: success(data, String(req.id)) };
});

const generate = wrap(async (req) => {
  const key = String(req.params.key);
  const data = await reportsService.generate(key, parseFilters(req.body));
  return { status: 200, body: success(data, String(req.id)) };
});

const exportReport = (req: Request, res: Response, next: NextFunction): void => {
  (async () => {
    const key = req.params.key as ReportKey;
    const result = await reportsService.generate(key, parseFilters(req.body));
    const sheets = buildReportExportSheets(result);
    const buffer = writeXlsx(sheets);
    const generatedOn = result.generatedAt.slice(0, 10);
    const filename = `${key}-${generatedOn}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.byteLength));
    res.status(200).end(buffer);
  })().catch(next);
};

export const reportsController = { listFilterOptions, generate, exportReport };
