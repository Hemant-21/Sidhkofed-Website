/**
 * Institution public controller — `/api/v1/public/institutions/*` and `/public/home/partners`
 * (API spec §5). No authentication; returns only published, publicly-visible, non-archived, due
 * institutions (the visibility predicate is enforced in the repository). Responses are
 * Redis-cached and invalidated on any admin write.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { institutionService } from './institutions.service';
import { parseInstitutionFilters, parseInstitutionOrdering } from './institutions.query';
import type { InstitutionFilters } from './institutions.types';

const PARTNERS_LIMIT = 24; // capped lightweight partner list for the homepage

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

function listCacheKey(surface: string, filters: InstitutionFilters, ordering: unknown, page: number, pageSize: number): string {
  const payload = JSON.stringify({ filters, ordering, page, pageSize });
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
  return `institutions:public:list:${surface}:${hash}`;
}

/** GET /public/institutions */
export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseInstitutionFilters(req, { admin: false });
  const ordering = parseInstitutionOrdering(req, false);
  const key = listCacheKey('institutions', filters, ordering, page.page, page.pageSize);
  const { items, total } = await institutionService.publicList(
    filters,
    ordering,
    { skip: page.skip, take: page.take, page: page.page, pageSize: page.pageSize },
    key,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

/** GET /public/home/partners — capped, homepage-flagged partner list. */
export const homePartners = wrap(async (req) => {
  const page = { skip: 0, take: PARTNERS_LIMIT, page: 1, pageSize: PARTNERS_LIMIT };
  const filters: InstitutionFilters = { showOnHomepage: true };
  const ordering = { field: 'display_order' as const, direction: 'asc' as const };
  const key = listCacheKey('partners', filters, ordering, 1, PARTNERS_LIMIT);
  const { items, total } = await institutionService.publicList(filters, ordering, page, key);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

/** GET /public/institutions/{slug} */
export const detail = wrap(async (req) => {
  const dto = await institutionService.publicDetailBySlug(req.params.slug as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const institutionPublicController = { list, homePartners, detail };
