/**
 * FAQ public controller — `/api/v1/public/faqs` (API spec §5). No authentication; returns only
 * published, publicly-visible, non-archived, due FAQs (the visibility predicate is enforced in the
 * repository), grouped by category/display order. Supports `faq_category` and `search` filters.
 * Responses are Redis-cached and invalidated on any admin write.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { faqService } from './faqs.service';
import { parseFaqFilters, parseFaqOrdering } from './faqs.query';
import type { FaqFilters } from './faqs.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function listCacheKey(filters: FaqFilters, ordering: unknown, page: number, pageSize: number): string {
  const payload = JSON.stringify({ filters, ordering, page, pageSize });
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
  return `faqs:public:list:${hash}`;
}

/** GET /public/faqs */
export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseFaqFilters(req, { admin: false });
  const ordering = parseFaqOrdering(req);
  const key = listCacheKey(filters, ordering, page.page, page.pageSize);
  const { items, total } = await faqService.publicList(
    filters,
    ordering,
    { skip: page.skip, take: page.take, page: page.page, pageSize: page.pageSize },
    key,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const faqPublicController = { list };
