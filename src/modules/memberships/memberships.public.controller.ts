/**
 * Membership public controller — `/api/v1/public/memberships` + `/public/memberships/{slug}`
 * (API spec §5). No authentication; returns only published, publicly-visible, non-archived, due
 * memberships (the visibility predicate is enforced in the repository). Institutional directory
 * only — no personal, voting, or dividend data, no internal notes/authorship. Responses are
 * Redis-cached and invalidated on any admin write.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { membershipService } from './memberships.service';
import { parseMembershipFilters, parseMembershipOrdering } from './memberships.query';
import type { MembershipFilters } from './memberships.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function listCacheKey(
  filters: MembershipFilters,
  ordering: unknown,
  page: number,
  pageSize: number,
): string {
  const payload = JSON.stringify({ filters, ordering, page, pageSize });
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
  return `memberships:public:list:${hash}`;
}

/** GET /public/memberships */
export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseMembershipFilters(req, { admin: false });
  const ordering = parseMembershipOrdering(req, false);
  const key = listCacheKey(filters, ordering, page.page, page.pageSize);
  const { items, total } = await membershipService.publicList(
    filters,
    ordering,
    { skip: page.skip, take: page.take, page: page.page, pageSize: page.pageSize },
    key,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

/** GET /public/memberships/{slug} */
export const detail = wrap(async (req) => {
  const dto = await membershipService.publicDetailBySlug(req.params.slug as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const membershipPublicController = { list, detail };
