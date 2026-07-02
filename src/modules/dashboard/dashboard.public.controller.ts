/**
 * Public Dashboard controller — `/api/v1/public/dashboard*` (API spec §5). No authentication;
 * returns only active, published, publicly-visible fixed reports and their resolved metrics. Internal
 * datasets, import metadata, and authorship are never exposed. Responses are Redis-cached in the
 * service and invalidated on any admin write.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { dashboardPublicService } from './dashboard.public.service';
import { parsePublicDashboardFilters } from './dashboard.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

/** GET /public/dashboard */
export const dashboard = wrap(async (req) => {
  const filters = parsePublicDashboardFilters(req);
  const data = await dashboardPublicService.dashboard(filters);
  return { status: 200, body: success(data, String(req.id)) };
});

/** GET /public/dashboard/kpis */
export const kpis = wrap(async (req) => {
  const filters = parsePublicDashboardFilters(req);
  const data = await dashboardPublicService.kpis(filters);
  return { status: 200, body: success(data, String(req.id)) };
});

/** GET /public/dashboard/{report_key} */
export const reportByKey = wrap(async (req) => {
  const filters = parsePublicDashboardFilters(req);
  const dto = await dashboardPublicService.reportByKey(req.params.report_key as string, filters);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const dashboardPublicController = { dashboard, kpis, reportByKey };
