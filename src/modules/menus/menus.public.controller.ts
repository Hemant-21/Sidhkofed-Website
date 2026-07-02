/**
 * Menu public controller — `/api/v1/public/menus?location=header|footer|utility` (API spec §5). No
 * authentication; returns the nested ACTIVE tree for the requested location, with non-public page
 * references dropped. Redis-cached and invalidated on any admin write.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { menuService } from './menus.service';
import { parsePublicMenuLocation } from './menus.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

/** GET /public/menus?location= */
export const tree = wrap(async (req) => {
  const location = parsePublicMenuLocation(req);
  const data = await menuService.publicTree(location);
  return { status: 200, body: success(data, String(req.id)) };
});

export const menuPublicController = { tree };
