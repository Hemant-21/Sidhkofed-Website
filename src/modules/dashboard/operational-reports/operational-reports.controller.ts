/**
 * Operational Reports admin controllers — `/api/v1/admin/dashboard/operational-reports/*`.
 * HTTP-only: parse → call the service → return through the shared envelope. Permissions are
 * enforced at the route layer.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { writeXlsx } from '@/utils/xlsx-writer';
import { operationalReportsService } from './operational-reports.service';
import { getReportDefinition } from './operational-reports.registry';
import { buildReportExportSheets } from './operational-reports.export';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

const listCatalogue = wrap(async (req) => {
  const data = operationalReportsService.listCatalogue();
  return { status: 200, body: success(data, String(req.id)) };
});

const generate = wrap(async (req) => {
  const data = await operationalReportsService.generate(String(req.params.key), req.body);
  return { status: 200, body: success(data, String(req.id)) };
});

/**
 * POST /admin/dashboard/operational-reports/:key/export — same body shape as `/generate`
 * (period + filters), same underlying `computeReport` read, rendered as a 3-sheet XLSX workbook
 * (Summary / Data / Definitions). Streams the file directly (no JSON envelope), matching the
 * enquiries export controller's convention.
 */
const exportReport = (req: Request, res: Response, next: NextFunction): void => {
  (async () => {
    const key = String(req.params.key);
    const result = await operationalReportsService.generateForExport(key, req.body);
    const def = getReportDefinition(key);
    if (!def) {
      // generateForExport already validates the key, so this should be unreachable in practice.
      throw new Error(`Registry is missing report definition for "${key}" after generation.`);
    }
    const sheets = buildReportExportSheets(def, result);
    const buffer = writeXlsx(sheets);
    const generatedOn = result.calculatedAt.toISOString().slice(0, 10);
    const filename = `${key}-${generatedOn}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.byteLength));
    res.status(200).end(buffer);
  })().catch(next);
};

export const operationalReportsController = { listCatalogue, generate, exportReport };
