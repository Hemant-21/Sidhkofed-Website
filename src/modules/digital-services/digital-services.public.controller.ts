/**
 * Digital Service public controller — `/api/v1/public/digital-services` (API spec §5). No
 * authentication; returns only published, publicly-visible, non-archived, due services (the
 * visibility predicate is enforced in the repository). Each item carries an `external_url` the client
 * opens in a new tab with rel="noopener noreferrer". Responses are Redis-cached and invalidated on
 * any admin write.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { digitalServiceService } from './digital-services.service';
import { parseDigitalServiceFilters, parseDigitalServiceOrdering } from './digital-services.query';
import type { DigitalServiceFilters } from './digital-services.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function listCacheKey(filters: DigitalServiceFilters, ordering: unknown, page: number, pageSize: number): string {
  const payload = JSON.stringify({ filters, ordering, page, pageSize });
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
  return `digital-services:public:list:${hash}`;
}

/** GET /public/digital-services */
export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseDigitalServiceFilters(req, { admin: false });
  const ordering = parseDigitalServiceOrdering(req);
  const key = listCacheKey(filters, ordering, page.page, page.pageSize);
  const { items, total } = await digitalServiceService.publicList(
    filters,
    ordering,
    { skip: page.skip, take: page.take, page: page.page, pageSize: page.pageSize },
    key,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const digitalServicePublicController = { list };
