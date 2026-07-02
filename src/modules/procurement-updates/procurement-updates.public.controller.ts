/**
 * Procurement Update public controller — `/api/v1/public/procurement-updates/*` (API spec §5). No
 * authentication; returns only published, publicly-visible, non-archived, due records (the
 * visibility predicate is enforced in the repository). Responses are Redis-cached and invalidated on
 * any admin write. Informational only — no transactions exposed.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { procurementUpdateService } from './procurement-updates.service';
import { parseProcurementUpdateFilters, parseProcurementUpdateOrdering } from './procurement-updates.query';
import type { ProcurementUpdateFilters } from './procurement-updates.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function listCacheKey(filters: ProcurementUpdateFilters, ordering: unknown, page: number, pageSize: number): string {
  const payload = JSON.stringify({ filters, ordering, page, pageSize });
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
  return `procurement-updates:public:list:${hash}`;
}

/** GET /public/procurement-updates */
export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseProcurementUpdateFilters(req, { admin: false });
  const ordering = parseProcurementUpdateOrdering(req);
  const key = listCacheKey(filters, ordering, page.page, page.pageSize);
  const { items, total } = await procurementUpdateService.publicList(
    filters,
    ordering,
    { skip: page.skip, take: page.take, page: page.page, pageSize: page.pageSize },
    key,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

/** GET /public/procurement-updates/{slug} */
export const detail = wrap(async (req) => {
  const dto = await procurementUpdateService.publicDetailBySlug(req.params.slug as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const procurementUpdatePublicController = { list, detail };
