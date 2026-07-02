/**
 * Official Communication public controller — `/api/v1/public/official-communications/*` (API spec
 * §5). No authentication; returns only published, publicly-visible, non-archived, due records (the
 * visibility predicate is enforced in the repository). Responses are Redis-cached and invalidated on
 * any admin write. Expiry is informational only — an expired-but-published communication still lists.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { officialCommunicationService } from './official-communications.service';
import {
  parseOfficialCommunicationFilters,
  parseOfficialCommunicationOrdering,
} from './official-communications.query';
import type { OfficialCommunicationFilters } from './official-communications.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function listCacheKey(filters: OfficialCommunicationFilters, ordering: unknown, page: number, pageSize: number): string {
  const payload = JSON.stringify({ filters, ordering, page, pageSize });
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
  return `official-communications:public:list:${hash}`;
}

/** GET /public/official-communications */
export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseOfficialCommunicationFilters(req, { admin: false });
  const ordering = parseOfficialCommunicationOrdering(req, false);
  const key = listCacheKey(filters, ordering, page.page, page.pageSize);
  const { items, total } = await officialCommunicationService.publicList(
    filters,
    ordering,
    { skip: page.skip, take: page.take, page: page.page, pageSize: page.pageSize },
    key,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

/** GET /public/official-communications/{slug} */
export const detail = wrap(async (req) => {
  const dto = await officialCommunicationService.publicDetailBySlug(req.params.slug as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const officialCommunicationPublicController = { list, detail };
