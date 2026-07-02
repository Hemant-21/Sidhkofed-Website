/**
 * Page public controller — `/api/v1/public/pages/{slug}` (API spec §5). No authentication; returns
 * only a published, publicly-visible, non-archived, due page (the visibility predicate is enforced
 * in the repository). The response is Redis-cached and invalidated on any admin write. There is no
 * public page list — pages are reached by their stable slug.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { pageService } from './pages.service';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

/** GET /public/pages/{slug} */
export const detail = wrap(async (req) => {
  const dto = await pageService.publicDetailBySlug(req.params.slug as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const pagePublicController = { detail };
