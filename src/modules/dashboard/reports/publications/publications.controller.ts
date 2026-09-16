/**
 * Report Publications admin controllers — `/api/v1/admin/dashboard/reports/publications/*`.
 * HTTP-only: parse → call the service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { auditContext } from '@/shared/request-context';
import { ValidationError } from '@/shared/errors';
import { publicationsService } from './publications.service';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

const getStatus = wrap(async (req) => {
  const data = await publicationsService.getStatusForFy(String(req.params.financialYearId));
  return { status: 200, body: success(data, String(req.id)) };
});

const getHistory = wrap(async (req) => {
  const data = await publicationsService.getHistoryForFy(String(req.params.financialYearId));
  return { status: 200, body: success(data, String(req.id)) };
});

const preview = wrap(async (req) => {
  const data = await publicationsService.generatePreview(String(req.params.financialYearId));
  return { status: 200, body: success(data, String(req.id)) };
});

const publish = wrap(async (req) => {
  const previewToken = req.body?.previewToken;
  if (typeof previewToken !== 'string' || previewToken.length === 0) {
    throw new ValidationError({ previewToken: ['previewToken is required.'] });
  }
  const data = await publicationsService.publish(String(req.params.financialYearId), previewToken, auditContext(req));
  return { status: 200, body: success(data, String(req.id)) };
});

export const publicationsController = { getStatus, getHistory, preview, publish };
