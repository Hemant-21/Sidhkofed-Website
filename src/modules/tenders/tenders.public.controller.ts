/**
 * Tender public controller — `/api/v1/public/tenders/*` (API spec §5). No authentication; returns
 * only published, publicly-visible, non-archived, due tenders (the visibility predicate is enforced
 * in the repository). Responses are Redis-cached and invalidated on any admin write. An expired
 * tender that remains published still lists — expiry is informational only.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { tenderService } from './tenders.service';
import { parseTenderFilters, parseTenderOrdering } from './tenders.query';
import type { TenderFilters } from './tenders.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function listCacheKey(filters: TenderFilters, ordering: unknown, page: number, pageSize: number): string {
  const payload = JSON.stringify({ filters, ordering, page, pageSize });
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
  return `tenders:public:list:${hash}`;
}

/** GET /public/tenders */
export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseTenderFilters(req, { admin: false });
  const ordering = parseTenderOrdering(req);
  const key = listCacheKey(filters, ordering, page.page, page.pageSize);
  const { items, total } = await tenderService.publicList(
    filters,
    ordering,
    { skip: page.skip, take: page.take, page: page.page, pageSize: page.pageSize },
    key,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

/** GET /public/tenders/{slug} */
export const detail = wrap(async (req) => {
  const dto = await tenderService.publicDetailBySlug(req.params.slug as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const tenderPublicController = { list, detail };
