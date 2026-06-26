/**
 * Search controllers — thin HTTP adapters (foundation 04-coding-standards §4): parse → validate →
 * call the service → return the standard paginated envelope. No business logic, no Prisma.
 *
 *   GET /api/v1/public/search  — unauthenticated; published/public records only.
 *   GET /api/v1/admin/search   — authenticated + RBAC (route); all publication states.
 */
import type { Request, Response, NextFunction } from 'express';
import { paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { parseSearchFilters } from './search.validators';
import { searchService } from './search.service';

const wrap =
  (fn: (req: Request, res: Response) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

/** GET /public/search */
export const publicSearch = wrap(async (req) => {
  const filters = parseSearchFilters(req);
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const { items, total } = await searchService.publicSearch(filters, { skip: page.skip, take: page.take });
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

/** GET /admin/search */
export const adminSearch = wrap(async (req, res) => {
  // Admin responses are never cached (api-specification.md §1.5).
  res.setHeader('Cache-Control', 'no-store');
  const filters = parseSearchFilters(req);
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const { items, total } = await searchService.adminSearch(filters, { skip: page.skip, take: page.take });
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const searchController = { publicSearch, adminSearch };
