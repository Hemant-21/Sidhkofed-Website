/**
 * Leadership public controller — `/api/v1/public/leadership`. No authentication; returns only
 * published, publicly-visible, non-archived, due leadership entries (the visibility predicate is
 * enforced in the repository). This IS the homepage leadership feed — there is no separate listing.
 * Responses are Redis-cached and invalidated on any admin write.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { leadershipService } from './leadership.service';
import { parseLeadershipFilters, parseLeadershipOrdering } from './leadership.query';
import type { LeadershipFilters } from './leadership.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function listCacheKey(filters: LeadershipFilters, ordering: unknown, page: number, pageSize: number): string {
  const payload = JSON.stringify({ filters, ordering, page, pageSize });
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
  return `leadership:public:list:${hash}`;
}

/** GET /public/leadership */
export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseLeadershipFilters(req, { admin: false });
  const ordering = parseLeadershipOrdering(req);
  const key = listCacheKey(filters, ordering, page.page, page.pageSize);
  const { items, total } = await leadershipService.publicList(
    filters,
    ordering,
    { skip: page.skip, take: page.take, page: page.page, pageSize: page.pageSize },
    key,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const leadershipPublicController = { list };
