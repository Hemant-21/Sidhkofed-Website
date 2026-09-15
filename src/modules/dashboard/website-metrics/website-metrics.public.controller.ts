/**
 * Public Website Metrics controller — `/api/v1/public/website-metrics` (Stage 3). No
 * authentication; returns only currently-published, enabled, non-archived metrics for one allowed
 * placement.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { websiteMetricsPublicService } from './website-metrics.public.service';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

/** GET /public/website-metrics?placement=homepage|about_us */
const list = wrap(async (req) => {
  const placement = typeof req.query.placement === 'string' ? req.query.placement : '';
  const data = await websiteMetricsPublicService.getPublicMetrics(placement);
  return { status: 200, body: success(data, String(req.id)) };
});

export const websiteMetricsPublicController = { list };
