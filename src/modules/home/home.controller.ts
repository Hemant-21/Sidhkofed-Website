/**
 * Public homepage controller — `GET /api/v1/public/home` (API spec §5). No authentication; returns
 * the curated aggregate of homepage-flagged, publicly-visible content only. No CMS-internal data.
 * `language` is accepted for forward compatibility but the payload already carries both `*_en`/`*_hi`
 * fields, so it does not change the response shape.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { homeService } from './home.service';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

/** GET /public/home */
export const home = wrap(async (req) => {
  const data = await homeService.aggregate();
  return { status: 200, body: success(data, String(req.id)) };
});

export const homeController = { home };
