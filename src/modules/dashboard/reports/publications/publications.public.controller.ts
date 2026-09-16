/**
 * Public Report Publications controller — `/api/v1/public/reports*`. No authentication.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { publicationsPublicService } from './publications.public.service';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

/** GET /public/reports/years — every FY with its published/current flags (never guesses). */
const listYears = wrap(async (req) => {
  const data = await publicationsPublicService.listYears();
  return { status: 200, body: success(data, String(req.id)) };
});

/** GET /public/reports/:label — the approved snapshot for one FY. 404 if unpublished/unknown. */
const getByLabel = wrap(async (req) => {
  const data = await publicationsPublicService.getForFinancialYearLabel(String(req.params.label));
  return { status: 200, body: success(data, String(req.id)) };
});

export const publicationsPublicController = { listYears, getByLabel };
