/**
 * Public Operational Reports controller — `/api/v1/public/operational-reports*`. No authentication.
 * HTTP-only: call the service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { operationalReportsPublicService } from './operational-reports.public.service';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

/** GET /public/operational-reports */
const listAll = wrap(async (req) => {
  const data = await operationalReportsPublicService.getAllPublicReports();
  return { status: 200, body: success(data, String(req.id)) };
});

/** GET /public/operational-reports/:key */
const getOne = wrap(async (req) => {
  const dto = await operationalReportsPublicService.getPublicReport(String(req.params.key));
  return { status: 200, body: success(dto, String(req.id)) };
});

export const operationalReportsPublicController = { listAll, getOne };
