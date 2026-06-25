/**
 * Event public controller — `/api/v1/public/events/*` (API spec §5). No auth; published only;
 * Redis-cached.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { eventService } from './events.service';
import { parseEventFilters, parseEventOrdering } from './events.query';
import type { EventFilters } from './events.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

function listCacheKey(filters: EventFilters, ordering: unknown, page: number, pageSize: number): string {
  const hash = createHash('sha1').update(JSON.stringify({ filters, ordering, page, pageSize })).digest('hex').slice(0, 16);
  return `events:public:list:${hash}`;
}

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseEventFilters(req, { admin: false });
  const ordering = parseEventOrdering(req, false);
  const key = listCacheKey(filters, ordering, page.page, page.pageSize);
  const { items, total } = await eventService.publicList(
    filters,
    ordering,
    { skip: page.skip, take: page.take, page: page.page, pageSize: page.pageSize },
    key,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await eventService.publicDetailBySlug(req.params.slug as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const eventPublicController = { list, detail };
